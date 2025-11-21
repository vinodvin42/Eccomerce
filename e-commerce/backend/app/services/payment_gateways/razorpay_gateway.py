"""Razorpay payment gateway integration."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

import razorpay
from razorpay.errors import BadRequestError, ServerError

from app.core.config import get_settings
from app.services.payment_gateways.base import PaymentGateway, PaymentResult

settings = get_settings()


class RazorpayGateway(PaymentGateway):
    """Razorpay payment gateway implementation."""

    def __init__(self, key_id: str | None = None, key_secret: str | None = None):
        """Initialize Razorpay gateway."""
        key_id = key_id or getattr(settings, "razorpay_key_id", None) or "rzp_test_placeholder"
        key_secret = key_secret or getattr(settings, "razorpay_key_secret", None) or "rzp_secret_placeholder"
        self.client = razorpay.Client(auth=(key_id, key_secret))

    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        order_id: str,
        customer_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> PaymentResult:
        """Create a Razorpay order."""
        try:
            order_data = {
                "amount": int(amount * 100),  # Convert to paise (smallest currency unit)
                "currency": currency.upper(),
                "receipt": order_id,
                "notes": metadata or {},
            }

            if customer_id:
                order_data["notes"]["customer_id"] = customer_id

            razorpay_order = self.client.order.create(data=order_data)

            return PaymentResult(
                success=True,
                transaction_id=razorpay_order["id"],
                payment_intent_id=razorpay_order["id"],
                amount=Decimal(razorpay_order["amount"]) / 100,
                currency=razorpay_order["currency"].upper(),
                status="created",
                metadata={
                    "razorpay_order_id": razorpay_order["id"],
                    "receipt": razorpay_order.get("receipt"),
                    "status": razorpay_order.get("status"),
                },
            )
        except (BadRequestError, ServerError) as e:
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
        """Verify and confirm a Razorpay payment."""
        try:
            # In Razorpay, payment is confirmed via webhook or by verifying payment signature
            # This method verifies the payment status
            payment = self.client.payment.fetch(payment_intent_id)

            return PaymentResult(
                success=payment["status"] == "captured" or payment["status"] == "authorized",
                transaction_id=payment["id"],
                payment_intent_id=payment.get("order_id"),
                amount=Decimal(payment["amount"]) / 100,
                currency=payment["currency"].upper(),
                status=payment["status"],
                metadata={
                    "razorpay_payment_id": payment["id"],
                    "order_id": payment.get("order_id"),
                    "status": payment["status"],
                },
            )
        except (BadRequestError, ServerError) as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                status="failed",
            )

    async def get_payment_status(self, transaction_id: str) -> PaymentResult:
        """Get Razorpay payment status."""
        try:
            payment = self.client.payment.fetch(transaction_id)

            return PaymentResult(
                success=payment["status"] == "captured" or payment["status"] == "authorized",
                transaction_id=payment["id"],
                payment_intent_id=payment.get("order_id"),
                amount=Decimal(payment["amount"]) / 100,
                currency=payment["currency"].upper(),
                status=payment["status"],
                metadata={
                    "razorpay_payment_id": payment["id"],
                    "order_id": payment.get("order_id"),
                    "status": payment["status"],
                },
            )
        except (BadRequestError, ServerError) as e:
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
        """Refund a Razorpay payment."""
        try:
            refund_data: dict[str, Any] = {}
            if amount:
                refund_data["amount"] = int(amount * 100)  # Convert to paise
            if reason:
                refund_data["notes"] = {"reason": reason}

            refund = self.client.payment.refund(transaction_id, refund_data)

            return PaymentResult(
                success=refund["status"] == "processed",
                transaction_id=refund["id"],
                amount=Decimal(refund["amount"]) / 100,
                currency=refund["currency"].upper(),
                status=refund["status"],
                metadata={
                    "razorpay_refund_id": refund["id"],
                    "payment_id": refund.get("payment_id"),
                    "status": refund["status"],
                },
            )
        except (BadRequestError, ServerError) as e:
            return PaymentResult(
                success=False,
                error_message=str(e),
                status="failed",
            )

