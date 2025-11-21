"""Stripe payment gateway integration."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

import stripe

# Handle Stripe error imports for different versions
# Stripe v8+ changed error module structure
try:
    # Try the old way first (stripe.error.StripeError)
    from stripe.error import StripeError  # type: ignore[attr-defined]
except (ImportError, AttributeError):
    # For newer Stripe versions, try direct import
    try:
        StripeError = stripe.StripeError  # type: ignore[attr-defined]
    except AttributeError:
        # Ultimate fallback: use Exception
        StripeError = Exception

from app.core.config import get_settings
from app.services.payment_gateways.base import PaymentGateway, PaymentResult

settings = get_settings()

# Initialize Stripe (will use STRIPE_SECRET_KEY from environment)
stripe.api_key = getattr(settings, "stripe_secret_key", None) or "sk_test_placeholder"


class StripeGateway(PaymentGateway):
    """Stripe payment gateway implementation."""

    def __init__(self, secret_key: str | None = None):
        """Initialize Stripe gateway."""
        if secret_key:
            stripe.api_key = secret_key
        elif hasattr(settings, "stripe_secret_key") and settings.stripe_secret_key:
            stripe.api_key = settings.stripe_secret_key

    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        order_id: str,
        customer_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> PaymentResult:
        """Create a Stripe payment intent."""
        try:
            intent_data = {
                "amount": int(amount * 100),  # Convert to cents
                "currency": currency.lower(),
                "metadata": {
                    "order_id": order_id,
                    **(metadata or {}),
                },
            }

            if customer_id:
                intent_data["customer"] = customer_id

            intent = stripe.PaymentIntent.create(**intent_data)

            return PaymentResult(
                success=True,
                transaction_id=intent.id,
                payment_intent_id=intent.id,
                amount=Decimal(intent.amount) / 100,
                currency=intent.currency.upper(),
                status=intent.status,
                client_secret=intent.client_secret,
                requires_action=intent.status == "requires_action",
                metadata={
                    "stripe_payment_intent": intent.id,
                    "status": intent.status,
                },
            )
        except StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                status="failed",
            )

    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: str | None = None,
    ) -> PaymentResult:
        """Confirm a Stripe payment intent."""
        try:
            intent_data = {}
            if payment_method_id:
                intent_data["payment_method"] = payment_method_id

            intent = stripe.PaymentIntent.confirm(payment_intent_id, **intent_data)

            return PaymentResult(
                success=intent.status == "succeeded",
                transaction_id=intent.id,
                payment_intent_id=intent.id,
                amount=Decimal(intent.amount) / 100,
                currency=intent.currency.upper(),
                status=intent.status,
                metadata={
                    "stripe_payment_intent": intent.id,
                    "status": intent.status,
                    "charges": [charge.id for charge in intent.charges.data] if intent.charges else [],
                },
            )
        except StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                status="failed",
            )

    async def get_payment_status(self, transaction_id: str) -> PaymentResult:
        """Get Stripe payment intent status."""
        try:
            intent = stripe.PaymentIntent.retrieve(transaction_id)

            return PaymentResult(
                success=intent.status == "succeeded",
                transaction_id=intent.id,
                payment_intent_id=intent.id,
                amount=Decimal(intent.amount) / 100,
                currency=intent.currency.upper(),
                status=intent.status,
                metadata={
                    "stripe_payment_intent": intent.id,
                    "status": intent.status,
                },
            )
        except StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                status="failed",
            )

    async def refund_payment(
        self,
        transaction_id: str,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> PaymentResult:
        """Refund a Stripe payment."""
        try:
            # First, get the charge ID from the payment intent
            intent = stripe.PaymentIntent.retrieve(transaction_id)
            if not intent.charges.data:
                return PaymentResult(
                    success=False,
                    error_message="No charges found for this payment intent",
                )

            charge_id = intent.charges.data[0].id

            refund_data: dict[str, Any] = {"charge": charge_id}
            if amount:
                refund_data["amount"] = int(amount * 100)  # Convert to cents
            if reason:
                refund_data["reason"] = reason

            refund = stripe.Refund.create(**refund_data)

            return PaymentResult(
                success=refund.status == "succeeded",
                transaction_id=refund.id,
                amount=Decimal(refund.amount) / 100,
                currency=refund.currency.upper(),
                status=refund.status,
                metadata={
                    "stripe_refund": refund.id,
                    "charge_id": charge_id,
                    "status": refund.status,
                },
            )
        except StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                status="failed",
            )

