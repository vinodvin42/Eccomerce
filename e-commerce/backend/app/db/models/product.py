"""Product persistence model."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditMixin, Base, TenantMixin


class Product(TenantMixin, AuditMixin, Base):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(length=255), nullable=False)
    sku: Mapped[str] = mapped_column(String(length=64), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    price_currency: Mapped[str] = mapped_column(String(length=3), nullable=False)
    price_amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    inventory: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True
    )
    
    # Jewelry-specific fields
    weight: Mapped[Numeric | None] = mapped_column(Numeric(10, 3), nullable=True, comment="Product weight in grams")
    material: Mapped[str | None] = mapped_column(String(length=100), nullable=True, comment="Material type (e.g., Gold, Silver, Platinum)")
    purity: Mapped[str | None] = mapped_column(String(length=50), nullable=True, comment="Purity (e.g., 22K, 18K, 925)")
    stone_type: Mapped[str | None] = mapped_column(String(length=100), nullable=True, comment="Stone type (e.g., Diamond, Ruby, Emerald)")
    size: Mapped[str | None] = mapped_column(String(length=50), nullable=True, comment="Size (e.g., Ring size, Chain length)")
    brand: Mapped[str | None] = mapped_column(String(length=100), nullable=True, comment="Brand or manufacturer name")
    color: Mapped[str | None] = mapped_column(String(length=50), nullable=True, comment="Color (e.g., Yellow Gold, White Gold, Rose Gold)")
    certification: Mapped[str | None] = mapped_column(String(length=200), nullable=True, comment="Certification details")
    warranty_period: Mapped[str | None] = mapped_column(String(length=50), nullable=True, comment="Warranty period (e.g., 1 Year, Lifetime)")
    origin: Mapped[str | None] = mapped_column(String(length=100), nullable=True, comment="Origin or country of manufacture")
    
    # Additional jewelry-specific fields
    hsn_code: Mapped[str | None] = mapped_column(String(length=50), nullable=True, comment="HSN Code for taxation")
    stone_weight: Mapped[Numeric | None] = mapped_column(Numeric(10, 3), nullable=True, comment="Stone weight in grams")
    gross_weight: Mapped[Numeric | None] = mapped_column(Numeric(10, 3), nullable=True, comment="Gross weight in grams")
    rate_per_gram: Mapped[Numeric | None] = mapped_column(Numeric(10, 2), nullable=True, comment="Rate per gram in currency")
    gender: Mapped[str | None] = mapped_column(String(length=20), nullable=True, comment="Gender (Male, Female, Unisex)")
    ready_to_deliver: Mapped[bool | None] = mapped_column(Boolean(), nullable=True, default=False, comment="Ready to deliver status")
    
    # Pricing and calculation fields
    group: Mapped[str | None] = mapped_column(String(length=100), nullable=True, comment="Group (e.g., Gold, Silver, Rose Gold)")
    wastage_percent: Mapped[Numeric | None] = mapped_column(Numeric(5, 2), nullable=True, comment="Wastage percentage")
    metal_value: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True, comment="Metal value in currency")
    wastage_value: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True, comment="Wastage value in currency")
    making_charges: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True, comment="Making charges in currency")
    stone_charges: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True, comment="Stone charges in currency")
    gst_percent: Mapped[Numeric | None] = mapped_column(Numeric(5, 2), nullable=True, comment="GST percentage")

    # Relationships
    category: Mapped["Category | None"] = relationship("Category", foreign_keys=[category_id])

