"""Tenant management routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_request_actor
from app.db.models.tenant import Tenant
from app.db.session import get_session
from app.schemas.tenant import TenantCreate, TenantOnboardingRequest, TenantOnboardingResponse, TenantRead
from app.services.tenants import TenantService

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenants"])


@router.post("/onboard", response_model=TenantOnboardingResponse, status_code=status.HTTP_201_CREATED)
async def onboard_tenant(
    payload: TenantOnboardingRequest,
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Onboard a new tenant with admin user and initial setup."""
    service = TenantService(session)
    result = await service.onboard_tenant(actor_id, payload)
    return TenantOnboardingResponse(
        tenant=serialize_tenant(result["tenant"]),
        admin_user_id=result["admin_user_id"],
        admin_email=result["admin_email"],
        message="Tenant onboarded successfully. Admin user created and initial setup completed.",
    )


@router.post("", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    payload: TenantCreate,
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    service = TenantService(session)
    tenant = await service.create_tenant(actor_id, payload)
    return serialize_tenant(tenant)


@router.get("", response_model=dict)
async def list_tenants(
    session: AsyncSession = Depends(get_session),
):
    service = TenantService(session)
    tenants = await service.list_tenants()
    return {
        "items": [serialize_tenant(tenant) for tenant in tenants],
        "total": len(tenants),
        "page": 1,
        "pageSize": len(tenants),
    }


@router.get("/{tenant_id}", response_model=TenantRead)
async def get_tenant(
    tenant_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    service = TenantService(session)
    tenant = await service.get_tenant(tenant_id)
    return serialize_tenant(tenant)


def serialize_tenant(tenant: Tenant) -> TenantRead:
    return TenantRead(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        status=tenant.status,
        primary_contact=tenant.primary_contact,
        audit={
            "created_by": tenant.created_by,
            "created_date": tenant.created_date,
            "modified_by": tenant.modified_by,
            "modified_date": tenant.modified_date,
        },
    )

