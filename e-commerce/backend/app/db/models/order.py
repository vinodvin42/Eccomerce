"""Order persistence models."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditMixin, Base, TenantMixin


class OrderStatus(str, enum.Enum):
    pending_payment = "PendingPayment"
    confirmed = "Confirmed"
    cancelled = "Cancelled"

    @classmethod
    def _missing_(cls, value: object) -> "OrderStatus | None":
        """Handle case-insensitive enum matching."""
        if isinstance(value, str):
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None


class Order(TenantMixin, AuditMixin, Base):
    __tablename__ = "orders"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    payment_method_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_methods.id"), nullable=False, index=True
    )
    shipping_method_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipping_methods.id"), nullable=True, index=True
    )
    shipping_address: Mapped[str | None] = mapped_column(String(length=1024), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=OrderStatus.pending_payment,
    )
    total_currency: Mapped[str] = mapped_column(String(length=3), nullable=False)
    total_amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod", foreign_keys=[payment_method_id])
    shipping_method: Mapped["ShippingMethod | None"] = relationship(
        "ShippingMethod", foreign_keys=[shipping_method_id]
    )


class OrderItem(TenantMixin, AuditMixin, Base):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_currency: Mapped[str] = mapped_column(String(length=3), nullable=False)
    unit_price_amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")

