"""Shipping method persistence model."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import AuditMixin, Base, TenantMixin


class ShippingMethod(TenantMixin, AuditMixin, Base):
    __tablename__ = "shipping_methods"

    name: Mapped[str] = mapped_column(String(length=255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(length=500), nullable=True)
    estimated_days_min: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # Minimum estimated delivery days
    estimated_days_max: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # Maximum estimated delivery days
    base_cost_currency: Mapped[str] = mapped_column(String(length=3), nullable=False, default="INR")
    base_cost_amount: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    cost_per_kg_currency: Mapped[str | None] = mapped_column(
        String(length=3), nullable=True
    )  # Optional per-kg cost
    cost_per_kg_amount: Mapped[Numeric | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # Optional per-kg cost
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    requires_signature: Mapped[bool] = mapped_column(
        default=False, nullable=False
    )  # Whether signature is required
    is_express: Mapped[bool] = mapped_column(default=False, nullable=False)  # Express shipping flag

