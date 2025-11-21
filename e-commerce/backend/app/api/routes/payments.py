"""Payment processing API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.payment_transaction import PaymentTransaction
from app.db.session import get_session
from app.schemas.payment import (
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    CreatePaymentIntentRequest,
    PaymentTransactionRead,
    RefundPaymentRequest,
)
from app.services.payments import PaymentService

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])


@router.post("/intent", response_model=PaymentTransactionRead)
async def create_payment_intent(
    payload: CreatePaymentIntentRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Create a payment intent for an order."""
    service = PaymentService(session)
    transaction = await service.create_payment_intent(tenant.tenant_id, payload.order_id, actor_id)
    return serialize_payment_transaction(transaction)


@router.post("/confirm", response_model=ConfirmPaymentResponse)
async def confirm_payment(
    payload: ConfirmPaymentRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Confirm a payment transaction."""
    service = PaymentService(session)
    transaction = await service.confirm_payment(
        tenant.tenant_id, payload.transaction_id, payload.payment_method_id, actor_id
    )

    # Get order status
    from app.db.models.order import Order
    from sqlalchemy import select

    order_result = await session.execute(select(Order).where(Order.id == transaction.order_id))
    order = order_result.scalar_one_or_none()

    return ConfirmPaymentResponse(
        transaction=serialize_payment_transaction(transaction),
        order_status=order.status.value if order else "unknown",
        success=transaction.status.value == "Succeeded",
    )


@router.get("/{transaction_id}", response_model=PaymentTransactionRead)
async def get_payment_status(
    transaction_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Get payment transaction status."""
    service = PaymentService(session)
    transaction = await service.get_payment_status(tenant.tenant_id, transaction_id)
    return serialize_payment_transaction(transaction)


@router.post("/refund", response_model=PaymentTransactionRead)
async def refund_payment(
    payload: RefundPaymentRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Refund a payment (full or partial)."""
    service = PaymentService(session)
    transaction = await service.refund_payment(
        tenant.tenant_id, payload.transaction_id, actor_id, payload.amount, payload.reason
    )
    return serialize_payment_transaction(transaction)


def serialize_payment_transaction(transaction: PaymentTransaction) -> PaymentTransactionRead:
    """Serialize payment transaction model to schema."""
    import json

    metadata = None
    client_secret = None
    if transaction.provider_metadata:
        try:
            metadata = json.loads(transaction.provider_metadata)
            client_secret = metadata.get("client_secret")
        except (json.JSONDecodeError, TypeError):
            pass

    return PaymentTransactionRead(
        id=transaction.id,
        order_id=transaction.order_id,
        payment_method_id=transaction.payment_method_id,
        provider=transaction.provider,
        provider_transaction_id=transaction.provider_transaction_id,
        provider_payment_intent_id=transaction.provider_payment_intent_id,
        amount_currency=transaction.amount_currency,
        amount=transaction.amount,
        fee_amount=transaction.fee_amount,
        net_amount=transaction.net_amount,
        status=transaction.status,
        metadata=metadata,  # Schema field name remains 'metadata' for API compatibility
        failure_reason=transaction.failure_reason,
        last4=transaction.last4,
        card_brand=transaction.card_brand,
        refund_amount=transaction.refund_amount,
        refund_reason=transaction.refund_reason,
        client_secret=client_secret,
        audit={
            "created_by": transaction.created_by,
            "created_date": transaction.created_date,
            "modified_by": transaction.modified_by,
            "modified_date": transaction.modified_date,
        },
    )

