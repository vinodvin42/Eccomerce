"""Product schemas."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.shared import AuditSchema, Money


class ProductBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    sku: str
    description: Optional[str] = None
    price: Money
    inventory: int = Field(ge=0)
    image_url: Optional[str] = Field(default=None, alias="imageUrl")
    category_id: Optional[UUID] = Field(default=None, alias="categoryId")
    
    # Jewelry-specific fields
    weight: Optional[float] = Field(default=None, ge=0, description="Product weight in grams")
    material: Optional[str] = Field(default=None, max_length=100, description="Material type (e.g., Gold, Silver, Platinum)")
    purity: Optional[str] = Field(default=None, max_length=50, description="Purity (e.g., 22K, 18K, 925)")
    stone_type: Optional[str] = Field(default=None, max_length=100, alias="stoneType", description="Stone type (e.g., Diamond, Ruby, Emerald)")
    size: Optional[str] = Field(default=None, max_length=50, description="Size (e.g., Ring size, Chain length)")
    brand: Optional[str] = Field(default=None, max_length=100, description="Brand or manufacturer name")
    color: Optional[str] = Field(default=None, max_length=50, description="Color (e.g., Yellow Gold, White Gold, Rose Gold)")
    certification: Optional[str] = Field(default=None, max_length=200, description="Certification details")
    warranty_period: Optional[str] = Field(default=None, max_length=50, alias="warrantyPeriod", description="Warranty period (e.g., 1 Year, Lifetime)")
    origin: Optional[str] = Field(default=None, max_length=100, description="Origin or country of manufacture")
    
    # Additional jewelry-specific fields
    hsn_code: Optional[str] = Field(default=None, max_length=50, alias="hsnCode", description="HSN Code for taxation")
    stone_weight: Optional[float] = Field(default=None, ge=0, alias="stoneWeight", description="Stone weight in grams")
    gross_weight: Optional[float] = Field(default=None, ge=0, alias="grossWeight", description="Gross weight in grams")
    rate_per_gram: Optional[float] = Field(default=None, ge=0, alias="ratePerGram", description="Rate per gram in currency")
    gender: Optional[str] = Field(default=None, max_length=20, description="Gender (Male, Female, Unisex)")
    ready_to_deliver: Optional[bool] = Field(default=None, alias="readyToDeliver", description="Ready to deliver status")
    
    # Pricing and calculation fields
    group: Optional[str] = Field(default=None, max_length=100, description="Group (e.g., Gold, Silver, Rose Gold)")
    wastage_percent: Optional[float] = Field(default=None, ge=0, alias="wastagePercent", description="Wastage percentage")
    metal_value: Optional[float] = Field(default=None, ge=0, alias="metalValue", description="Metal value in currency")
    wastage_value: Optional[float] = Field(default=None, ge=0, alias="wastageValue", description="Wastage value in currency")
    making_charges: Optional[float] = Field(default=None, ge=0, alias="makingCharges", description="Making charges in currency")
    stone_charges: Optional[float] = Field(default=None, ge=0, alias="stoneCharges", description="Stone charges in currency")
    gst_percent: Optional[float] = Field(default=None, ge=0, alias="gstPercent", description="GST percentage")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Money] = None
    inventory: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = Field(default=None, alias="imageUrl")
    category_id: Optional[UUID] = Field(default=None, alias="categoryId")
    
    # Jewelry-specific fields
    weight: Optional[float] = Field(default=None, ge=0)
    material: Optional[str] = Field(default=None, max_length=100)
    purity: Optional[str] = Field(default=None, max_length=50)
    stone_type: Optional[str] = Field(default=None, max_length=100, alias="stoneType")
    size: Optional[str] = Field(default=None, max_length=50)
    brand: Optional[str] = Field(default=None, max_length=100)
    color: Optional[str] = Field(default=None, max_length=50)
    certification: Optional[str] = Field(default=None, max_length=200)
    warranty_period: Optional[str] = Field(default=None, max_length=50, alias="warrantyPeriod")
    origin: Optional[str] = Field(default=None, max_length=100)
    
    # Additional jewelry-specific fields
    hsn_code: Optional[str] = Field(default=None, max_length=50, alias="hsnCode")
    stone_weight: Optional[float] = Field(default=None, ge=0, alias="stoneWeight")
    gross_weight: Optional[float] = Field(default=None, ge=0, alias="grossWeight")
    rate_per_gram: Optional[float] = Field(default=None, ge=0, alias="ratePerGram")
    gender: Optional[str] = Field(default=None, max_length=20)
    ready_to_deliver: Optional[bool] = Field(default=None, alias="readyToDeliver")
    
    # Pricing and calculation fields
    group: Optional[str] = Field(default=None, max_length=100)
    wastage_percent: Optional[float] = Field(default=None, ge=0, alias="wastagePercent")
    metal_value: Optional[float] = Field(default=None, ge=0, alias="metalValue")
    wastage_value: Optional[float] = Field(default=None, ge=0, alias="wastageValue")
    making_charges: Optional[float] = Field(default=None, ge=0, alias="makingCharges")
    stone_charges: Optional[float] = Field(default=None, ge=0, alias="stoneCharges")
    gst_percent: Optional[float] = Field(default=None, ge=0, alias="gstPercent")


class ProductRead(ProductBase):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    audit: AuditSchema


class ProductListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: List[ProductRead]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int

