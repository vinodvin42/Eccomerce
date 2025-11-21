"""Tenant schemas."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.tenant import TenantStatus
from app.schemas.shared import AuditSchema


class TenantCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    slug: str
    primary_contact: str = Field(alias="primaryContact")


class TenantOnboardingRequest(BaseModel):
    """Request schema for tenant onboarding wizard."""

    model_config = ConfigDict(populate_by_name=True)

    # Tenant details
    tenant_name: str = Field(alias="tenantName")
    tenant_slug: str = Field(alias="tenantSlug")
    primary_contact: str = Field(alias="primaryContact")

    # Admin user details
    admin_email: str = Field(alias="adminEmail")
    admin_username: str = Field(alias="adminUsername")
    admin_password: str = Field(alias="adminPassword")
    admin_full_name: str = Field(alias="adminFullName")

    # Initial setup options
    setup_default_catalog: bool = Field(default=True, alias="setupDefaultCatalog")
    setup_default_payment_methods: bool = Field(default=True, alias="setupDefaultPaymentMethods")
    setup_default_shipping_methods: bool = Field(default=True, alias="setupDefaultShippingMethods")


class TenantOnboardingResponse(BaseModel):
    """Response schema for tenant onboarding."""

    model_config = ConfigDict(populate_by_name=True)

    tenant: TenantRead
    admin_user_id: UUID = Field(alias="adminUserId")
    admin_email: str = Field(alias="adminEmail")
    message: str


class TenantUpdate(BaseModel):
    """Schema for updating tenant details."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    slug: str | None = None
    primary_contact: str | None = Field(default=None, alias="primaryContact")


class TenantSuspendRequest(BaseModel):
    """Schema for suspending a tenant."""

    model_config = ConfigDict(populate_by_name=True)

    reason: str = Field(description="Reason for suspending the tenant")


class TenantRead(TenantCreate):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    status: TenantStatus = TenantStatus.active
    audit: AuditSchema

