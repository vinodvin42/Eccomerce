"""Payment processing service."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import (
    publish_payment_failed,
    publish_payment_intent_created,
    publish_payment_succeeded,
)
from app.db.models.order import Order, OrderStatus
from app.db.models.payment_method import PaymentMethod, PaymentMethodType
from app.db.models.payment_transaction import PaymentProvider, PaymentStatus, PaymentTransaction
from app.services.payment_gateways import RazorpayGateway, StripeGateway


class PaymentService:
    """Service for processing payments."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _get_gateway(self, payment_method: PaymentMethod) -> StripeGateway | RazorpayGateway:
        """Get the appropriate payment gateway based on payment method."""
        # This is a simplified version - in production, you'd check tenant/payment method config
        if payment_method.type == PaymentMethodType.credit_card or payment_method.type == PaymentMethodType.debit_card:
            # Default to Stripe for card payments
            return StripeGateway()
        # Add more logic based on tenant configuration
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment gateway not configured for payment method type: {payment_method.type}",
        )

    async def create_payment_intent(
        self,
        tenant_id: UUID,
        order_id: UUID,
        actor_id: UUID,
    ) -> PaymentTransaction:
        """Create a payment intent for an order."""
        # Get order
        order_result = await self.session.execute(
            select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id)
        )
        order = order_result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

        if order.status != OrderStatus.pending_payment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order status must be PendingPayment, current status: {order.status}",
            )

        # Get payment method
        payment_method_result = await self.session.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == order.payment_method_id, PaymentMethod.tenant_id == tenant_id
            )
        )
        payment_method = payment_method_result.scalar_one_or_none()
        if not payment_method:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found.")

        # Check if payment transaction already exists
        existing_result = await self.session.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.order_id == order_id,
                PaymentTransaction.tenant_id == tenant_id,
                PaymentTransaction.status.in_([PaymentStatus.pending, PaymentStatus.processing]),
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            return existing

        # Determine payment provider
        provider = PaymentProvider.manual
        if payment_method.requires_processing:
            if payment_method.type in (PaymentMethodType.credit_card, PaymentMethodType.debit_card):
                provider = PaymentProvider.stripe
            # Add more provider logic based on configuration

        # Create payment transaction
        transaction = PaymentTransaction(
            tenant_id=tenant_id,
            order_id=order_id,
            payment_method_id=order.payment_method_id,
            provider=provider,
            amount_currency=order.total_currency,
            amount=order.total_amount,
            status=PaymentStatus.pending,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(transaction)
        await self.session.flush()

        # Create payment intent with gateway if needed
        if provider != PaymentProvider.manual:
            gateway = self._get_gateway(payment_method)
            result = await gateway.create_payment_intent(
                amount=order.total_amount,
                currency=order.total_currency,
                order_id=str(order_id),
                customer_id=str(order.customer_id),
                metadata={"tenant_id": str(tenant_id)},
            )

            if result.success:
                transaction.provider_transaction_id = result.transaction_id
                transaction.provider_payment_intent_id = result.payment_intent_id
                transaction.status = PaymentStatus.processing
                if result.metadata:
                    import json

                    transaction.provider_metadata = json.dumps(result.metadata)
                if result.client_secret:
                    transaction.provider_metadata = json.dumps(
                        {**(json.loads(transaction.provider_metadata) if transaction.provider_metadata else {}), "client_secret": result.client_secret}
                    )
            else:
                transaction.status = PaymentStatus.failed
                transaction.failure_reason = result.error_message
        else:
            # Manual payment (COD, etc.) - mark as processing
            transaction.status = PaymentStatus.processing

        await self.session.commit()
        await self.session.refresh(transaction)

        # Publish payment.intent_created event
        publish_payment_intent_created(
            transaction_id=transaction.id,
            order_id=order_id,
            tenant_id=tenant_id,
            amount=float(transaction.amount),
            currency=transaction.amount_currency,
            provider=transaction.provider.value if transaction.provider else None,
        )

        return transaction

    async def confirm_payment(
        self,
        tenant_id: UUID,
        transaction_id: UUID,
        payment_method_id: str | None = None,
        actor_id: UUID | None = None,
    ) -> PaymentTransaction:
        """Confirm a payment transaction."""
        transaction_result = await self.session.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.id == transaction_id, PaymentTransaction.tenant_id == tenant_id
            )
        )
        transaction = transaction_result.scalar_one_or_none()
        if not transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment transaction not found.")

        if transaction.status not in (PaymentStatus.pending, PaymentStatus.processing):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction status must be Pending or Processing, current: {transaction.status}",
            )

        # Get order
        order_result = await self.session.execute(
            select(Order).where(Order.id == transaction.order_id, Order.tenant_id == tenant_id)
        )
        order = order_result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

        # Get payment method
        payment_method_result = await self.session.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == transaction.payment_method_id, PaymentMethod.tenant_id == tenant_id
            )
        )
        payment_method = payment_method_result.scalar_one_or_none()

        # Confirm with gateway if needed
        if transaction.provider != PaymentProvider.manual and transaction.provider_payment_intent_id:
            gateway = self._get_gateway(payment_method) if payment_method else StripeGateway()
            result = await gateway.confirm_payment(
                payment_intent_id=transaction.provider_payment_intent_id,
                payment_method_id=payment_method_id,
            )

            if result.success:
                transaction.status = PaymentStatus.succeeded
                transaction.provider_transaction_id = result.transaction_id
                if result.metadata:
                    import json

                    existing_metadata = json.loads(transaction.provider_metadata) if transaction.provider_metadata else {}
                    transaction.provider_metadata = json.dumps({**existing_metadata, **result.metadata})
                # Update order status
                order.status = OrderStatus.confirmed
            else:
                transaction.status = PaymentStatus.failed
                transaction.failure_reason = result.error_message
        else:
            # Manual payment - mark as succeeded
            transaction.status = PaymentStatus.succeeded
            order.status = OrderStatus.confirmed

        if actor_id:
            transaction.modified_by = actor_id
            order.modified_by = actor_id

        await self.session.commit()
        await self.session.refresh(transaction)

        # Publish payment events
        if transaction.status == PaymentStatus.succeeded:
            publish_payment_succeeded(
                transaction_id=transaction.id,
                order_id=transaction.order_id,
                tenant_id=tenant_id,
                amount=float(transaction.amount),
                currency=transaction.amount_currency,
                provider=transaction.provider.value if transaction.provider else None,
            )
        elif transaction.status == PaymentStatus.failed:
            publish_payment_failed(
                transaction_id=transaction.id,
                order_id=transaction.order_id,
                tenant_id=tenant_id,
                failure_reason=transaction.failure_reason or "Payment confirmation failed",
            )

        return transaction

    async def get_payment_status(self, tenant_id: UUID, transaction_id: UUID) -> PaymentTransaction:
        """Get payment transaction status."""
        transaction_result = await self.session.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.id == transaction_id, PaymentTransaction.tenant_id == tenant_id
            )
        )
        transaction = transaction_result.scalar_one_or_none()
        if not transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment transaction not found.")

        # Sync status with gateway if needed
        if transaction.provider != PaymentProvider.manual and transaction.provider_transaction_id:
            gateway = StripeGateway()  # Simplified - should determine based on provider
            result = await gateway.get_payment_status(transaction.provider_transaction_id)

            if result.status != transaction.status.value:
                if result.status == "succeeded":
                    transaction.status = PaymentStatus.succeeded
                    # Update order status
                    order_result = await self.session.execute(
                        select(Order).where(Order.id == transaction.order_id)
                    )
                    order = order_result.scalar_one_or_none()
                    if order:
                        order.status = OrderStatus.confirmed
                    # Publish payment succeeded event
                    publish_payment_succeeded(
                        transaction_id=transaction.id,
                        order_id=transaction.order_id,
                        tenant_id=transaction.tenant_id,
                        amount=float(transaction.amount),
                        currency=transaction.amount_currency,
                        provider=transaction.provider.value if transaction.provider else None,
                    )
                elif result.status == "failed":
                    transaction.status = PaymentStatus.failed
                    transaction.failure_reason = result.error_message
                    # Publish payment failed event
                    publish_payment_failed(
                        transaction_id=transaction.id,
                        order_id=transaction.order_id,
                        tenant_id=transaction.tenant_id,
                        failure_reason=result.error_message or "Payment failed",
                    )

                await self.session.commit()
                await self.session.refresh(transaction)

        return transaction

