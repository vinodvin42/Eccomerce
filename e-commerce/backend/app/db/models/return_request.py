"""Return request persistence model."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditMixin, Base, TenantMixin

if TYPE_CHECKING:  # pragma: no cover
    from app.db.models.order import Order
    from app.db.models.payment_transaction import PaymentTransaction
    from app.db.models.user import User


class ReturnStatus(str, enum.Enum):
    """Lifecycle for a return request."""

    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"
    refunded = "Refunded"


class ReturnRequest(TenantMixin, AuditMixin, Base):
    """Return/Exchange ticket raised against an order."""

    __tablename__ = "return_requests"
    __table_args__ = (
        UniqueConstraint("tenant_id", "order_id", name="uq_return_requests_tenant_order"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(String(length=2000), nullable=False)
    resolution_notes: Mapped[str | None] = mapped_column(String(length=2000), nullable=True)
    status: Mapped[ReturnStatus] = mapped_column(
        Enum(ReturnStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ReturnStatus.pending,
    )
    refund_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_transactions.id"), nullable=True, index=True
    )
    refund_amount: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)
    refund_currency: Mapped[str | None] = mapped_column(String(length=3), nullable=True)

    order: Mapped["Order | None"] = relationship("Order", foreign_keys=[order_id], lazy="selectin")
    refund_transaction: Mapped["PaymentTransaction | None"] = relationship(
        "PaymentTransaction", foreign_keys=[refund_transaction_id]
    )
    customer: Mapped["User | None"] = relationship(
        "User",
        primaryjoin="ReturnRequest.customer_id == User.id",
        lazy="joined",
        viewonly=True,
    )

