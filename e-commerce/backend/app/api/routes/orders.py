"""Order API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Optional

from app.core.auth import get_current_active_user, get_current_user_optional
from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.order import Order
from app.db.models.user import User
from app.db.session import get_session
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.schemas.order import OrderCancelRequest, OrderCreate, OrderRead, OrderUpdate
from app.schemas.payment import PaymentTransactionRead
from app.schemas.shared import Money
from app.services.checkout_saga import CheckoutSagaOrchestrator
from app.services.orders import OrderService

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


@router.post("/checkout", response_model=CheckoutResponse, status_code=201)
async def checkout(
    payload: CheckoutRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Complete checkout with saga orchestration (order + payment + inventory + notifications)."""
    saga = CheckoutSagaOrchestrator(session)
    result = await saga.execute_checkout(
        tenant_id=tenant.tenant_id,
        actor_id=actor_id,
        order_payload=payload.order,
        payment_method_id=payload.payment_method_id,
    )

    return CheckoutResponse(
        order=serialize_order(result["order"]),
        payment_transaction=serialize_payment_transaction(result["payment_transaction"])
        if result["payment_transaction"]
        else None,
        saga_status=result["saga_status"],
        client_secret=result.get("client_secret"),
        requires_payment_confirmation=result["saga_status"] == "in_progress",
    )


@router.post("", response_model=OrderRead, status_code=201)
async def create_order(
    payload: OrderCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Create order without payment processing (legacy endpoint)."""
    service = OrderService(session)
    order = await service.create_order(tenant.tenant_id, actor_id, payload)
    return serialize_order(order)


@router.get("", response_model=dict)
async def list_orders(
    tenant: TenantContext = Depends(get_tenant_context),
    customer_id: UUID | None = Query(None, description="Filter by customer ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
):
    """List orders. If customer_id is provided, filter by it. Otherwise, use current user's customer ID."""
    service = OrderService(session)

    # If customer_id not provided and user is authenticated, use user's tenant context
    # For customers, filter by their customer_id (which should match user.id for customer role)
    filter_customer_id = customer_id
    if not filter_customer_id and current_user and current_user.role.value == "Customer":
        filter_customer_id = current_user.id

    if filter_customer_id:
        orders, total = await service.list_customer_orders(
            tenant.tenant_id, filter_customer_id, page, page_size
        )
    else:
        # Admin view - list all orders for tenant
        orders, total = await service.list_tenant_orders(tenant.tenant_id, page, page_size)

    return {
        "items": [serialize_order(order) for order in orders],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: Optional[User] = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
):
    """Get order by ID. Customers can only view their own orders."""
    service = OrderService(session)
    order = await service.get_order(tenant.tenant_id, order_id)

    # Authorization: Customers can only view their own orders
    if current_user and current_user.role.value == "Customer" and order.customer_id != current_user.id:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own orders",
        )

    return serialize_order(order)


@router.put("/{order_id}", response_model=OrderRead)
async def update_order(
    order_id: UUID,
    payload: OrderUpdate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Update an existing order."""
    service = OrderService(session)
    order = await service.update_order(tenant.tenant_id, order_id, actor_id, payload)
    return serialize_order(order)


@router.post("/{order_id}/cancel", response_model=OrderRead)
async def cancel_order(
    order_id: UUID,
    payload: OrderCancelRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Cancel an order. Releases reserved inventory and publishes cancellation event."""
    service = OrderService(session)
    order = await service.cancel_order(tenant.tenant_id, order_id, actor_id, payload.reason)
    return serialize_order(order)


def serialize_order(order: Order) -> OrderRead:
    return OrderRead(
        id=order.id,
        tenantId=order.tenant_id,
        customerId=order.customer_id,
        status=order.status,
        items=[
            {
                "productId": item.product_id,
                "quantity": item.quantity,
                "unitPrice": Money(
                    currency=item.unit_price_currency,
                    amount=float(item.unit_price_amount),
                ),
            }
            for item in order.items
        ],
        total=Money(currency=order.total_currency, amount=float(order.total_amount)),
        audit={
            "createdBy": order.created_by,
            "createdDate": order.created_date,
            "modifiedBy": order.modified_by,
            "modifiedDate": order.modified_date,
        },
    )


def serialize_payment_transaction(transaction) -> PaymentTransactionRead | None:
    """Serialize payment transaction for response."""
    if not transaction:
        return None
    from app.api.routes.payments import serialize_payment_transaction as serialize_payment

    return serialize_payment(transaction)

