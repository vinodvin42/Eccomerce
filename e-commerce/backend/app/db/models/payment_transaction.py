"""Payment transaction persistence model."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import AuditMixin, Base, TenantMixin


class PaymentProvider(str, enum.Enum):
    """Payment service provider."""

    stripe = "Stripe"
    razorpay = "Razorpay"
    manual = "Manual"  # For COD, bank transfer, etc.


class PaymentStatus(str, enum.Enum):
    """Payment transaction status."""

    pending = "Pending"
    processing = "Processing"
    succeeded = "Succeeded"
    failed = "Failed"
    cancelled = "Cancelled"
    refunded = "Refunded"
    partially_refunded = "PartiallyRefunded"


class PaymentTransaction(TenantMixin, AuditMixin, Base):
    """Payment transaction record."""

    __tablename__ = "payment_transactions"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True
    )
    payment_method_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_methods.id"), nullable=False, index=True
    )

    # Payment provider details
    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(PaymentProvider, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    provider_transaction_id: Mapped[str | None] = mapped_column(
        String(length=255), nullable=True, index=True
    )  # External transaction ID from provider
    provider_payment_intent_id: Mapped[str | None] = mapped_column(
        String(length=255), nullable=True
    )  # Payment intent ID (Stripe) or order ID (Razorpay)

    # Amount details
    amount_currency: Mapped[str] = mapped_column(String(length=3), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    fee_amount: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)  # Processing fee
    net_amount: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)  # Amount after fees

    # Status
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=PaymentStatus.pending,
    )

    # Metadata (using provider_metadata as attribute name since 'metadata' is reserved in SQLAlchemy)
    # Column name in database remains 'metadata' for compatibility
    provider_metadata: Mapped[str | None] = mapped_column("metadata", Text, nullable=True)  # JSON metadata from provider
    failure_reason: Mapped[str | None] = mapped_column(String(length=500), nullable=True)  # Error message if failed

    # Card/payment method details (tokenized, never store full card numbers)
    last4: Mapped[str | None] = mapped_column(String(length=4), nullable=True)  # Last 4 digits
    card_brand: Mapped[str | None] = mapped_column(String(length=50), nullable=True)  # Visa, Mastercard, etc.
    card_exp_month: Mapped[int | None] = mapped_column(nullable=True)
    card_exp_year: Mapped[int | None] = mapped_column(nullable=True)

    # Refund tracking
    refund_amount: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True, default=0)
    refund_reason: Mapped[str | None] = mapped_column(String(length=500), nullable=True)

