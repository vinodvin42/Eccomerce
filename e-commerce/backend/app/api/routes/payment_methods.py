"""Payment method API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.payment_method import PaymentMethod
from app.db.session import get_session
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodListResponse, PaymentMethodRead, PaymentMethodUpdate
from app.services.payment_methods import PaymentMethodService

router = APIRouter(prefix="/api/v1/payment-methods", tags=["Payment Methods"])


@router.get("", response_model=PaymentMethodListResponse)
async def list_payment_methods(
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200, alias="pageSize"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """List payment methods for the tenant."""
    service = PaymentMethodService(session)
    payment_methods, total = await service.list_payment_methods(
        tenant.tenant_id, page=page, page_size=page_size, is_active=is_active
    )
    return PaymentMethodListResponse(
        items=[serialize_payment_method(pm) for pm in payment_methods],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{payment_method_id}", response_model=PaymentMethodRead)
async def get_payment_method(
    payment_method_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Get payment method by ID."""
    service = PaymentMethodService(session)
    payment_method = await service.get_payment_method(tenant.tenant_id, payment_method_id)
    return serialize_payment_method(payment_method)


@router.post("", response_model=PaymentMethodRead, status_code=201)
async def create_payment_method(
    payload: PaymentMethodCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Create a new payment method."""
    service = PaymentMethodService(session)
    payment_method = await service.create_payment_method(tenant.tenant_id, actor_id, payload)
    return serialize_payment_method(payment_method)


@router.put("/{payment_method_id}", response_model=PaymentMethodRead)
async def update_payment_method(
    payment_method_id: UUID,
    payload: PaymentMethodUpdate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Update an existing payment method."""
    service = PaymentMethodService(session)
    payment_method = await service.update_payment_method(tenant.tenant_id, payment_method_id, actor_id, payload)
    return serialize_payment_method(payment_method)


def serialize_payment_method(payment_method: PaymentMethod) -> PaymentMethodRead:
    return PaymentMethodRead(
        id=payment_method.id,
        tenantId=payment_method.tenant_id,
        name=payment_method.name,
        type=payment_method.type,
        description=payment_method.description,
        isActive=payment_method.is_active,
        requiresProcessing=payment_method.requires_processing,
        processingFeePercentage=payment_method.processing_fee_percentage,
        processingFeeFixed=payment_method.processing_fee_fixed,
        audit={
            "createdBy": payment_method.created_by,
            "createdDate": payment_method.created_date,
            "modifiedBy": payment_method.modified_by,
            "modifiedDate": payment_method.modified_date,
        },
    )

