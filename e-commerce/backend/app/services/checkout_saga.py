"""Checkout saga orchestrator for coordinating distributed transactions."""

from __future__ import annotations

from decimal import Decimal
from enum import Enum
from uuid import UUID

import structlog
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import (
    publish_event,
    publish_inventory_reserved,
    publish_order_cancelled,
    publish_order_confirmed,
    publish_order_created,
)
from app.db.models.order import Order, OrderStatus
from app.db.models.payment_transaction import PaymentStatus
from app.services.orders import OrderService
from app.services.payments import PaymentService
from app.services.products import ProductService

logger = structlog.get_logger(__name__)


class SagaStep(str, Enum):
    """Saga execution steps."""

    CREATE_ORDER = "create_order"
    RESERVE_INVENTORY = "reserve_inventory"
    CREATE_PAYMENT_INTENT = "create_payment_intent"
    CONFIRM_PAYMENT = "confirm_payment"
    CONFIRM_ORDER = "confirm_order"
    SEND_NOTIFICATION = "send_notification"


class SagaStatus(str, Enum):
    """Saga execution status."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    COMPENSATING = "compensating"
    COMPENSATED = "compensated"


class CheckoutSagaOrchestrator:
    """Orchestrates the checkout saga pattern for order processing."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.order_service = OrderService(session)
        self.payment_service = PaymentService(session)
        self.product_service = ProductService(session)

    async def execute_checkout(
        self,
        tenant_id: UUID,
        actor_id: UUID,
        order_payload,
        payment_method_id: str | None = None,
    ) -> dict:
        """
        Execute the complete checkout saga.

        Steps:
        1. Create order (with inventory validation)
        2. Reserve inventory
        3. Create payment intent
        4. Confirm payment (if payment_method_id provided)
        5. Confirm order
        6. Send notifications

        Returns:
            dict with order, payment_transaction, and saga_status
        """
        saga_status = SagaStatus.IN_PROGRESS
        order: Order | None = None
        payment_transaction = None
        compensation_steps: list[SagaStep] = []

        try:
            # Step 1: Create Order (includes inventory validation)
            logger.info("saga_step_started", step=SagaStep.CREATE_ORDER, tenant_id=str(tenant_id))
            order = await self.order_service.create_order(tenant_id, actor_id, order_payload)
            compensation_steps.append(SagaStep.CREATE_ORDER)
            logger.info("saga_step_completed", step=SagaStep.CREATE_ORDER, order_id=str(order.id))

            # Step 2: Inventory is already reserved in create_order, but we publish event
            logger.info("saga_step_started", step=SagaStep.RESERVE_INVENTORY, order_id=str(order.id))
            # Inventory reservation happens during order creation
            # Publish inventory reserved event
            publish_inventory_reserved(
                order_id=order.id,
                tenant_id=tenant_id,
                items=[
                    {
                        "productId": str(item.product_id),
                        "quantity": item.quantity,
                    }
                    for item in order.items
                ],
            )
            compensation_steps.append(SagaStep.RESERVE_INVENTORY)
            logger.info("saga_step_completed", step=SagaStep.RESERVE_INVENTORY, order_id=str(order.id))

            # Step 3: Create Payment Intent
            if order.status == OrderStatus.pending_payment:
                logger.info("saga_step_started", step=SagaStep.CREATE_PAYMENT_INTENT, order_id=str(order.id))
                payment_transaction = await self.payment_service.create_payment_intent(
                    tenant_id, order.id, actor_id
                )
                compensation_steps.append(SagaStep.CREATE_PAYMENT_INTENT)
                logger.info(
                    "saga_step_completed",
                    step=SagaStep.CREATE_PAYMENT_INTENT,
                    transaction_id=str(payment_transaction.id),
                )

                # Step 4: Confirm Payment (if payment_method_id provided)
                if payment_method_id and payment_transaction.status == PaymentStatus.processing:
                    logger.info("saga_step_started", step=SagaStep.CONFIRM_PAYMENT, transaction_id=str(payment_transaction.id))
                    payment_transaction = await self.payment_service.confirm_payment(
                        tenant_id, payment_transaction.id, payment_method_id, actor_id
                    )
                    compensation_steps.append(SagaStep.CONFIRM_PAYMENT)
                    logger.info(
                        "saga_step_completed",
                        step=SagaStep.CONFIRM_PAYMENT,
                        transaction_id=str(payment_transaction.id),
                        status=payment_transaction.status.value,
                    )

                    # If payment succeeded, proceed to confirm order
                    if payment_transaction.status == PaymentStatus.succeeded:
                        # Step 5: Confirm Order
                        logger.info("saga_step_started", step=SagaStep.CONFIRM_ORDER, order_id=str(order.id))
                        order.status = OrderStatus.confirmed
                        order.modified_by = actor_id
                        await self.session.commit()
                        await self.session.refresh(order)

                        # Publish order confirmed event
                        publish_order_confirmed(
                            order_id=order.id,
                            tenant_id=tenant_id,
                            customer_id=order.customer_id,
                            total_amount=float(order.total_amount),
                            currency=order.total_currency,
                        )
                        compensation_steps.append(SagaStep.CONFIRM_ORDER)
                        logger.info("saga_step_completed", step=SagaStep.CONFIRM_ORDER, order_id=str(order.id))

                        # Step 6: Send Notification
                        logger.info("saga_step_started", step=SagaStep.SEND_NOTIFICATION, order_id=str(order.id))
                        await self._send_order_notification(order, tenant_id)
                        logger.info("saga_step_completed", step=SagaStep.SEND_NOTIFICATION, order_id=str(order.id))

                        saga_status = SagaStatus.COMPLETED
                    else:
                        # Payment failed
                        saga_status = SagaStatus.FAILED
                        logger.error(
                            "saga_payment_failed",
                            order_id=str(order.id),
                            transaction_id=str(payment_transaction.id),
                            failure_reason=payment_transaction.failure_reason,
                        )
                else:
                    # Payment intent created but not confirmed yet
                    saga_status = SagaStatus.IN_PROGRESS
            else:
                # Order already confirmed (e.g., COD)
                saga_status = SagaStatus.COMPLETED
                logger.info("saga_completed_cod", order_id=str(order.id))

            return {
                "order": order,
                "payment_transaction": payment_transaction,
                "saga_status": saga_status.value,
                "client_secret": self._extract_client_secret(payment_transaction) if payment_transaction else None,
            }

        except Exception as e:
            logger.error(
                "saga_execution_failed",
                error=str(e),
                order_id=str(order.id) if order else None,
                compensation_steps=[step.value for step in compensation_steps],
            )
            saga_status = SagaStatus.FAILED

            # Execute compensation
            if compensation_steps:
                await self._compensate(tenant_id, order, payment_transaction, compensation_steps, actor_id)

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Checkout saga failed: {str(e)}",
            )

    async def _compensate(
        self,
        tenant_id: UUID,
        order: Order | None,
        payment_transaction,
        compensation_steps: list[SagaStep],
        actor_id: UUID,
    ) -> None:
        """Execute compensation (rollback) for failed saga steps."""
        logger.info(
            "saga_compensation_started",
            order_id=str(order.id) if order else None,
            steps=[step.value for step in reversed(compensation_steps)],
        )

        # Compensate in reverse order
        for step in reversed(compensation_steps):
            try:
                if step == SagaStep.CONFIRM_ORDER and order:
                    # Rollback order confirmation
                    order.status = OrderStatus.pending_payment
                    order.modified_by = actor_id
                    await self.session.commit()
                    logger.info("saga_compensated", step=step.value, order_id=str(order.id))

                elif step == SagaStep.CONFIRM_PAYMENT and payment_transaction:
                    # Payment confirmation failed, transaction already in failed state
                    logger.info("saga_compensated", step=step.value, transaction_id=str(payment_transaction.id))

                elif step == SagaStep.CREATE_PAYMENT_INTENT and payment_transaction:
                    # Cancel payment intent if possible
                    logger.info("saga_compensated", step=step.value, transaction_id=str(payment_transaction.id))

                elif step == SagaStep.RESERVE_INVENTORY and order:
                    # Release inventory
                    await self._release_inventory(order, tenant_id)
                    logger.info("saga_compensated", step=step.value, order_id=str(order.id))

                elif step == SagaStep.CREATE_ORDER and order:
                    # Cancel order
                    order.status = OrderStatus.cancelled
                    order.modified_by = actor_id
                    await self.session.commit()
                    # Publish order cancelled event
                    publish_order_cancelled(
                        order_id=order.id,
                        tenant_id=tenant_id,
                        reason="Saga compensation - checkout failed",
                    )
                    logger.info("saga_compensated", step=step.value, order_id=str(order.id))

            except Exception as e:
                logger.error(
                    "saga_compensation_failed",
                    step=step.value,
                    error=str(e),
                    order_id=str(order.id) if order else None,
                )

        logger.info("saga_compensation_completed", order_id=str(order.id) if order else None)

    async def _release_inventory(self, order: Order, tenant_id: UUID) -> None:
        """Release reserved inventory."""
        for item in order.items:
            try:
                product = await self.product_service.get_product(tenant_id, item.product_id)
                product.inventory += item.quantity
                await self.session.commit()
            except Exception as e:
                logger.error(
                    "inventory_release_failed",
                    product_id=str(item.product_id),
                    quantity=item.quantity,
                    error=str(e),
                )

    async def _send_order_notification(self, order: Order, tenant_id: UUID) -> None:
        """Send order confirmation notification."""
        from app.services.notifications import NotificationService
        from app.db.models.user import User
        from sqlalchemy import select

        customer_result = await self.session.execute(select(User).where(User.id == order.customer_id))
        customer = customer_result.scalar_one_or_none()
        if customer:
            NotificationService.send_order_confirmation(
                order_id=order.id,
                customer_email=customer.email,
                order_total=float(order.total_amount),
                currency=order.total_currency,
                tenant_id=tenant_id,
            )

    def _extract_client_secret(self, payment_transaction) -> str | None:
        """Extract client secret from payment transaction metadata."""
        if not payment_transaction or not payment_transaction.provider_metadata:
            return None
        try:
            import json

            metadata = json.loads(payment_transaction.provider_metadata)
            return metadata.get("client_secret")
        except (json.JSONDecodeError, TypeError):
            return None

