"""Discount/promotion schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.discount import DiscountScope, DiscountStatus, DiscountType
from app.schemas.shared import AuditSchema


class DiscountBase(BaseModel):
    """Base discount schema."""

    model_config = ConfigDict(populate_by_name=True)

    code: str = Field(..., min_length=3, max_length=64, description="Coupon code")
    name: str = Field(..., min_length=1, max_length=255, description="Display name")
    description: str | None = Field(None, max_length=1000, description="Description")
    discount_type: DiscountType = Field(..., alias="discountType")
    discount_value: Decimal | None = Field(None, alias="discountValue", description="Percentage (0-100) or fixed amount")
    discount_currency: str | None = Field(None, alias="discountCurrency", max_length=3, description="Currency for fixed amount")
    scope: DiscountScope
    product_id: UUID | None = Field(None, alias="productId", description="Product ID if scope is Product (deprecated, use productIds)")
    product_ids: List[UUID] | None = Field(None, alias="productIds", description="Product IDs if scope is Product")
    category_id: UUID | None = Field(None, alias="categoryId", description="Category ID if scope is Category")
    valid_from: datetime = Field(..., alias="validFrom")
    valid_until: datetime | None = Field(None, alias="validUntil")
    max_uses: int | None = Field(None, alias="maxUses", ge=1, description="Total usage limit")
    max_uses_per_customer: int | None = Field(None, alias="maxUsesPerCustomer", ge=1, description="Per-customer limit")
    minimum_order_amount: Decimal | None = Field(None, alias="minimumOrderAmount", ge=0)
    minimum_order_currency: str | None = Field(None, alias="minimumOrderCurrency", max_length=3)
    is_active: bool = Field(True, alias="isActive")

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        """Validate coupon code format."""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Code must contain only alphanumeric characters, hyphens, and underscores")
        return v.upper()

    @field_validator("discount_value")
    @classmethod
    def validate_discount_value(cls, v: Decimal | None, info) -> Decimal | None:
        """Validate discount value based on type."""
        if v is None:
            return v
        discount_type = info.data.get("discount_type")
        if discount_type == DiscountType.percentage:
            if v < 0 or v > 100:
                raise ValueError("Percentage discount must be between 0 and 100")
        elif discount_type == DiscountType.fixed_amount:
            if v < 0:
                raise ValueError("Fixed amount discount must be positive")
        return v


class DiscountCreate(DiscountBase):
    """Schema for creating a discount."""

    pass


class DiscountUpdate(BaseModel):
    """Schema for updating a discount."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    discount_type: DiscountType | None = Field(None, alias="discountType")
    discount_value: Decimal | None = Field(None, alias="discountValue")
    discount_currency: str | None = Field(None, alias="discountCurrency", max_length=3)
    scope: DiscountScope | None = None
    product_id: UUID | None = Field(None, alias="productId")
    product_ids: List[UUID] | None = Field(None, alias="productIds")
    category_id: UUID | None = Field(None, alias="categoryId")
    valid_from: datetime | None = Field(None, alias="validFrom")
    valid_until: datetime | None = Field(None, alias="validUntil")
    max_uses: int | None = Field(None, alias="maxUses", ge=1)
    max_uses_per_customer: int | None = Field(None, alias="maxUsesPerCustomer", ge=1)
    minimum_order_amount: Decimal | None = Field(None, alias="minimumOrderAmount", ge=0)
    minimum_order_currency: str | None = Field(None, alias="minimumOrderCurrency", max_length=3)
    is_active: bool | None = Field(None, alias="isActive")


class DiscountRead(DiscountBase):
    """Schema for reading a discount."""

    id: UUID
    status: DiscountStatus
    current_uses: int = Field(alias="currentUses")
    audit: AuditSchema


class DiscountListResponse(BaseModel):
    """Response schema for listing discounts."""

    model_config = ConfigDict(populate_by_name=True)

    items: list[DiscountRead]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")


class DiscountApplyRequest(BaseModel):
    """Request to apply a discount code."""

    model_config = ConfigDict(populate_by_name=True)

    code: str
    order_amount: Decimal = Field(..., alias="orderAmount", ge=0)
    order_currency: str = Field(..., alias="orderCurrency", max_length=3)
    customer_id: UUID | None = Field(None, alias="customerId")


class DiscountApplyResponse(BaseModel):
    """Response after applying a discount."""

    model_config = ConfigDict(populate_by_name=True)

    discount: DiscountRead
    discount_amount: Decimal = Field(..., alias="discountAmount")
    discount_currency: str = Field(..., alias="discountCurrency")
    final_amount: Decimal = Field(..., alias="finalAmount")

