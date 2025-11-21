"""Base payment gateway interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class PaymentResult:
    """Result of a payment operation."""

    success: bool
    transaction_id: str | None = None
    payment_intent_id: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    status: str | None = None
    metadata: dict[str, Any] | None = None
    error_message: str | None = None
    requires_action: bool = False
    client_secret: str | None = None  # For 3D Secure or similar


class PaymentGateway(ABC):
    """Abstract base class for payment gateway integrations."""

    @abstractmethod
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        order_id: str,
        customer_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> PaymentResult:
        """Create a payment intent for an order."""
        pass

    @abstractmethod
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: str | None = None,
    ) -> PaymentResult:
        """Confirm a payment intent."""
        pass

    @abstractmethod
    async def get_payment_status(self, transaction_id: str) -> PaymentResult:
        """Get the status of a payment transaction."""
        pass

    @abstractmethod
    async def refund_payment(
        self,
        transaction_id: str,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> PaymentResult:
        """Refund a payment (full or partial)."""
        pass

