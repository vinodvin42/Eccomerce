"""Shipping method schemas."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.shared import AuditSchema, Money


class ShippingMethodBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    description: Optional[str] = None
    estimated_days_min: Optional[int] = Field(default=None, alias="estimatedDaysMin")
    estimated_days_max: Optional[int] = Field(default=None, alias="estimatedDaysMax")
    base_cost: Money = Field(alias="baseCost")
    cost_per_kg: Optional[Money] = Field(default=None, alias="costPerKg")
    is_active: bool = True
    requires_signature: bool = False
    is_express: bool = False


class ShippingMethodCreate(ShippingMethodBase):
    pass


class ShippingMethodUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    description: Optional[str] = None
    estimated_days_min: Optional[int] = Field(default=None, alias="estimatedDaysMin")
    estimated_days_max: Optional[int] = Field(default=None, alias="estimatedDaysMax")
    base_cost: Optional[Money] = Field(default=None, alias="baseCost")
    cost_per_kg: Optional[Money] = Field(default=None, alias="costPerKg")
    is_active: Optional[bool] = None
    requires_signature: Optional[bool] = None
    is_express: Optional[bool] = None


class ShippingMethodRead(ShippingMethodBase):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    audit: AuditSchema


class ShippingMethodListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: List[ShippingMethodRead]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int

