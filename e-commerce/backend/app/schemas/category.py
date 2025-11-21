"""Category schemas."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.shared import AuditSchema


class CategoryBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    description: Optional[str] = None
    slug: str
    parent_id: Optional[UUID] = Field(default=None, alias="parentId")
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[UUID] = Field(default=None, alias="parentId")
    is_active: Optional[bool] = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    audit: AuditSchema


class CategoryListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: List[CategoryRead]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int

