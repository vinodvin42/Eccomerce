"""Shipping method API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.shipping_method import ShippingMethod
from app.db.session import get_session
from app.schemas.shipping_method import ShippingMethodCreate, ShippingMethodListResponse, ShippingMethodRead, ShippingMethodUpdate
from app.services.shipping_methods import ShippingMethodService

router = APIRouter(prefix="/api/v1/shipping-methods", tags=["Shipping Methods"])


@router.get("", response_model=ShippingMethodListResponse)
async def list_shipping_methods(
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200, alias="pageSize"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """List shipping methods for the tenant."""
    service = ShippingMethodService(session)
    shipping_methods, total = await service.list_shipping_methods(
        tenant.tenant_id, page=page, page_size=page_size, is_active=is_active
    )
    return ShippingMethodListResponse(
        items=[serialize_shipping_method(sm) for sm in shipping_methods],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{shipping_method_id}", response_model=ShippingMethodRead)
async def get_shipping_method(
    shipping_method_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Get shipping method by ID."""
    service = ShippingMethodService(session)
    shipping_method = await service.get_shipping_method(tenant.tenant_id, shipping_method_id)
    return serialize_shipping_method(shipping_method)


@router.post("", response_model=ShippingMethodRead, status_code=201)
async def create_shipping_method(
    payload: ShippingMethodCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Create a new shipping method."""
    service = ShippingMethodService(session)
    shipping_method = await service.create_shipping_method(tenant.tenant_id, actor_id, payload)
    return serialize_shipping_method(shipping_method)


@router.put("/{shipping_method_id}", response_model=ShippingMethodRead)
async def update_shipping_method(
    shipping_method_id: UUID,
    payload: ShippingMethodUpdate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Update an existing shipping method."""
    service = ShippingMethodService(session)
    shipping_method = await service.update_shipping_method(tenant.tenant_id, shipping_method_id, actor_id, payload)
    return serialize_shipping_method(shipping_method)


def serialize_shipping_method(shipping_method: ShippingMethod) -> ShippingMethodRead:
    from app.schemas.shared import Money

    return ShippingMethodRead(
        id=shipping_method.id,
        tenantId=shipping_method.tenant_id,
        name=shipping_method.name,
        description=shipping_method.description,
        estimatedDaysMin=shipping_method.estimated_days_min,
        estimatedDaysMax=shipping_method.estimated_days_max,
        baseCost=Money(currency=shipping_method.base_cost_currency, amount=float(shipping_method.base_cost_amount)),
        costPerKg=Money(currency=shipping_method.cost_per_kg_currency, amount=float(shipping_method.cost_per_kg_amount))
        if shipping_method.cost_per_kg_currency and shipping_method.cost_per_kg_amount
        else None,
        isActive=shipping_method.is_active,
        requiresSignature=shipping_method.requires_signature,
        isExpress=shipping_method.is_express,
        audit={
            "createdBy": shipping_method.created_by,
            "createdDate": shipping_method.created_date,
            "modifiedBy": shipping_method.modified_by,
            "modifiedDate": shipping_method.modified_date,
        },
    )

