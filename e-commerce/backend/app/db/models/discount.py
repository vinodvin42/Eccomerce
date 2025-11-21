"""Discount/promotion persistence model."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import AuditMixin, Base, TenantMixin


class DiscountType(str, enum.Enum):
    """Type of discount."""

    percentage = "Percentage"  # Percentage off (e.g., 10% off)
    fixed_amount = "FixedAmount"  # Fixed amount off (e.g., $5 off)
    free_shipping = "FreeShipping"  # Free shipping discount


class DiscountScope(str, enum.Enum):
    """Scope of discount application."""

    product = "Product"  # Apply to specific product
    category = "Category"  # Apply to products in category
    order = "Order"  # Apply to entire order
    cart = "Cart"  # Apply to entire cart


class DiscountStatus(str, enum.Enum):
    """Discount status."""

    active = "Active"
    inactive = "Inactive"
    expired = "Expired"


class Discount(TenantMixin, AuditMixin, Base):
    """Discount/promotion rule."""

    __tablename__ = "discounts"

    code: Mapped[str] = mapped_column(String(length=64), nullable=False, unique=True, index=True)  # Coupon code
    name: Mapped[str] = mapped_column(String(length=255), nullable=False)  # Display name
    description: Mapped[str | None] = mapped_column(String(length=1000), nullable=True)

    discount_type: Mapped[DiscountType] = mapped_column(
        ENUM(DiscountType, values_callable=lambda x: [e.value for e in x], name="discounttype", create_type=False),
        nullable=False
    )  # Percentage, FixedAmount, FreeShipping
    discount_value: Mapped[Numeric | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # Percentage (0-100) or fixed amount
    discount_currency: Mapped[str | None] = mapped_column(
        String(length=3), nullable=True
    )  # Currency for fixed amount discounts

    scope: Mapped[DiscountScope] = mapped_column(
        ENUM(DiscountScope, values_callable=lambda x: [e.value for e in x], name="discountscope", create_type=False),
        nullable=False
    )  # Product, Category, Order, Cart

    # Scope-specific targeting
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=True, index=True
    )  # If scope is Product (deprecated, use product_ids)
    product_ids: Mapped[list[uuid.UUID] | None] = mapped_column(
        JSONB, nullable=True
    )  # If scope is Product - multiple product IDs
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True
    )  # If scope is Category

    # Validity period
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Usage limits
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Total usage limit
    max_uses_per_customer: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # Per-customer usage limit
    current_uses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # Current usage count

    # Minimum requirements
    minimum_order_amount: Mapped[Numeric | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # Minimum order amount to apply
    minimum_order_currency: Mapped[str | None] = mapped_column(String(length=3), nullable=True)

    # Status
    status: Mapped[DiscountStatus] = mapped_column(
        ENUM(DiscountStatus, values_callable=lambda x: [e.value for e in x], name="discountstatus", create_type=False),
        nullable=False,
        default=DiscountStatus.active
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

