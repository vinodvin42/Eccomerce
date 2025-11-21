"""Order schemas."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.order import OrderStatus
from app.schemas.shared import AuditSchema, Money


class OrderItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    product_id: UUID = Field(alias="productId")
    quantity: int = Field(ge=1)
    unit_price: Money = Field(alias="unitPrice")


class OrderCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: List[OrderItem]
    customer_id: UUID = Field(alias="customerId")
    payment_method_id: UUID = Field(alias="paymentMethodId")
    shipping_address: str | None = Field(default=None, alias="shippingAddress")


class OrderUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: Optional[OrderStatus] = None
    shipping_address: Optional[str] = Field(default=None, alias="shippingAddress")
    shipping_method_id: Optional[UUID] = Field(default=None, alias="shippingMethodId")


class OrderRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    customer_id: UUID | None = Field(default=None, alias="customerId")
    status: OrderStatus
    items: List[OrderItem]
    total: Money
    audit: AuditSchema

