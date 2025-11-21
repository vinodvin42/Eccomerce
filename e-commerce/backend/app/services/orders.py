"""Order orchestration service."""

from __future__ import annotations

from decimal import Decimal
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.payment_method import PaymentMethod, PaymentMethodType
from app.db.models.shipping_method import ShippingMethod
from app.schemas.order import OrderCreate, OrderUpdate


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_order(self, tenant_id: UUID, actor_id: UUID, payload: OrderCreate) -> Order:
        from app.services.products import ProductService

        if not payload.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must contain at least one item",
            )

        # Validation: All items must use same currency
        currency = payload.items[0].unit_price.currency
        total_amount = Decimal("0.00")

        product_service = ProductService(self.session)

        # Validate products exist and reserve inventory
        for item in payload.items:
            if item.unit_price.currency != currency:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mixed currencies are not supported within a single order.",
                )

            # Validation: Quantity must be positive
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item quantity must be greater than zero (product: {item.product_id})",
                )

            # Validation: Unit price must be positive
            if item.unit_price.amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item unit price must be greater than zero (product: {item.product_id})",
                )

            # Check product exists and reserve inventory
            try:
                product = await product_service.reserve_inventory(tenant_id, item.product_id, item.quantity)
            except HTTPException:
                raise  # Re-raise inventory errors
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {item.product_id} not found or unavailable",
                ) from e

            total_amount += Decimal(str(item.unit_price.amount)) * item.quantity

        payment_method_result = await self.session.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == payload.payment_method_id,
                PaymentMethod.tenant_id == tenant_id,
            )
        )
        payment_method = payment_method_result.scalar_one_or_none()
        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method not found",
            )

        order_status = (
            OrderStatus.confirmed
            if payment_method.type == PaymentMethodType.cash_on_delivery
            else OrderStatus.pending_payment
        )

        order = Order(
            tenant_id=tenant_id,
            customer_id=payload.customer_id,
            payment_method_id=payload.payment_method_id,
            shipping_address=payload.shipping_address,
            status=order_status,
            total_currency=currency,
            total_amount=total_amount,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(order)
        await self.session.flush()

        for item in payload.items:
            order_item = OrderItem(
                tenant_id=tenant_id,
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price_currency=item.unit_price.currency,
                unit_price_amount=item.unit_price.amount,
                created_by=actor_id,
                modified_by=actor_id,
            )
            self.session.add(order_item)

        await self.session.commit()
        await self.session.refresh(order, attribute_names=["items"])

        # Publish order.created event
        from app.core.events import publish_order_created

        publish_order_created(
            order_id=order.id,
            tenant_id=tenant_id,
            customer_id=payload.customer_id,
            amount=float(total_amount),
            currency=currency,
        )

        # Send order confirmation notification (async)
        # Get customer email from user
        from app.db.models.user import User
        from app.services.notifications import NotificationService

        customer_result = await self.session.execute(
            select(User).where(User.id == payload.customer_id)
        )
        customer = customer_result.scalar_one_or_none()
        if customer:
            NotificationService.send_order_confirmation(
                order_id=order.id,
                customer_email=customer.email,
                order_total=float(total_amount),
                currency=currency,
                tenant_id=tenant_id,
            )

        return order

    async def get_order(self, tenant_id: UUID, order_id: UUID) -> Order:
        query = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id, Order.tenant_id == tenant_id)
        )
        result = await self.session.execute(query)
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return order

    async def list_customer_orders(
        self, tenant_id: UUID, customer_id: UUID, page: int = 1, page_size: int = 20
    ) -> tuple[Sequence[Order], int]:
        """List orders for a specific customer with pagination."""
        from sqlalchemy import func

        query = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.tenant_id == tenant_id, Order.customer_id == customer_id)
            .order_by(Order.created_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        count_stmt = (
            select(func.count())
            .select_from(Order)
            .where(Order.tenant_id == tenant_id, Order.customer_id == customer_id)
        )

        result = await self.session.execute(query)
        orders = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return orders, total

    async def list_tenant_orders(
        self, tenant_id: UUID, page: int = 1, page_size: int = 20
    ) -> tuple[Sequence[Order], int]:
        """List all orders for a tenant (admin view)."""
        from sqlalchemy import func

        query = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.tenant_id == tenant_id)
            .order_by(Order.created_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        count_stmt = select(func.count()).select_from(Order).where(Order.tenant_id == tenant_id)

        result = await self.session.execute(query)
        orders = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return orders, total

    async def update_order(
        self,
        tenant_id: UUID,
        order_id: UUID,
        actor_id: UUID,
        payload: OrderUpdate,
    ) -> Order:
        """Update order status, shipping address, or shipping method."""
        order = await self.get_order(tenant_id, order_id)

        updated = False
        provided_fields = payload.model_fields_set

        if payload.status is not None:
            if order.status != payload.status:
                order.status = payload.status
            updated = True

        if "shipping_address" in provided_fields:
            if order.shipping_address != payload.shipping_address:
                order.shipping_address = payload.shipping_address
            updated = True

        if "shipping_method_id" in provided_fields:
            if payload.shipping_method_id:
                result = await self.session.execute(
                    select(ShippingMethod).where(
                        ShippingMethod.id == payload.shipping_method_id,
                        ShippingMethod.tenant_id == tenant_id,
                    )
                )
                shipping_method = result.scalar_one_or_none()
                if not shipping_method:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Shipping method not found",
                    )
                order.shipping_method_id = shipping_method.id
            else:
                order.shipping_method_id = None
            updated = True

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields provided to update order",
            )

        order.modified_by = actor_id
        await self.session.commit()
        await self.session.refresh(order, attribute_names=["items"])
        return order

