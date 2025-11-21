"""Payment method schemas."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.payment_method import PaymentMethodType
from app.schemas.shared import AuditSchema


class PaymentMethodBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    type: PaymentMethodType
    description: Optional[str] = None
    is_active: bool = True
    requires_processing: bool = False
    processing_fee_percentage: Optional[float] = Field(default=None, alias="processingFeePercentage")
    processing_fee_fixed: Optional[float] = Field(default=None, alias="processingFeeFixed")


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    type: Optional[PaymentMethodType] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    requires_processing: Optional[bool] = None
    processing_fee_percentage: Optional[float] = Field(default=None, ge=0, le=100, alias="processingFeePercentage")
    processing_fee_fixed: Optional[float] = Field(default=None, ge=0, alias="processingFeeFixed")


class PaymentMethodRead(PaymentMethodBase):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    audit: AuditSchema


class PaymentMethodListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: List[PaymentMethodRead]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int

