"""Payment method persistence model."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import AuditMixin, Base, TenantMixin


class PaymentMethodType(str, enum.Enum):
    credit_card = "CreditCard"
    debit_card = "DebitCard"
    paypal = "PayPal"
    bank_transfer = "BankTransfer"
    cash_on_delivery = "CashOnDelivery"
    digital_wallet = "DigitalWallet"
    other = "Other"

    @classmethod
    def _missing_(cls, value: object) -> "PaymentMethodType | None":
        """Handle case-insensitive enum matching."""
        if isinstance(value, str):
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None


class PaymentMethod(TenantMixin, AuditMixin, Base):
    __tablename__ = "payment_methods"

    name: Mapped[str] = mapped_column(String(length=255), nullable=False)
    type: Mapped[PaymentMethodType] = mapped_column(
        Enum(PaymentMethodType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(String(length=500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    requires_processing: Mapped[bool] = mapped_column(
        default=False, nullable=False
    )  # Whether payment needs external processing
    processing_fee_percentage: Mapped[float | None] = mapped_column(
        nullable=True
    )  # Processing fee as percentage
    processing_fee_fixed: Mapped[float | None] = mapped_column(
        nullable=True
    )  # Fixed processing fee amount

