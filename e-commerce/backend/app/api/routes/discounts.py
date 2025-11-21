"""Discount/promotion API routes."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.discount import Discount, DiscountStatus
from app.db.session import get_session
from app.schemas.discount import (
    DiscountApplyRequest,
    DiscountApplyResponse,
    DiscountCreate,
    DiscountListResponse,
    DiscountRead,
    DiscountUpdate,
)
from app.services.discounts import DiscountService

router = APIRouter(prefix="/api/v1/discounts", tags=["Discounts"])


@router.get("", response_model=DiscountListResponse)
async def list_discounts(
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200, alias="pageSize"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    status_filter: DiscountStatus | None = Query(None, alias="status", description="Filter by status"),
):
    """List discounts for the tenant."""
    service = DiscountService(session)
    discounts, total = await service.list_discounts(
        tenant.tenant_id, page=page, page_size=page_size, is_active=is_active, status=status_filter
    )
    return DiscountListResponse(
        items=[serialize_discount(d) for d in discounts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{discount_id}", response_model=DiscountRead)
async def get_discount(
    discount_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Get a discount by ID."""
    service = DiscountService(session)
    discount = await service.get_discount(tenant.tenant_id, discount_id)
    return serialize_discount(discount)


@router.post("", response_model=DiscountRead, status_code=status.HTTP_201_CREATED)
async def create_discount(
    payload: DiscountCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Create a new discount."""
    service = DiscountService(session)
    discount = await service.create_discount(tenant.tenant_id, actor_id, payload)
    return serialize_discount(discount)


@router.put("/{discount_id}", response_model=DiscountRead)
async def update_discount(
    discount_id: UUID,
    payload: DiscountUpdate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Update a discount."""
    service = DiscountService(session)
    discount = await service.update_discount(tenant.tenant_id, discount_id, actor_id, payload)
    return serialize_discount(discount)


@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discount(
    discount_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Delete a discount (soft delete)."""
    service = DiscountService(session)
    await service.delete_discount(tenant.tenant_id, discount_id)


@router.post("/apply", response_model=DiscountApplyResponse)
async def apply_discount(
    payload: DiscountApplyRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Apply a discount code to an order."""
    service = DiscountService(session)
    discount, discount_amount = await service.apply_discount(
        tenant.tenant_id,
        payload.code,
        payload.order_amount,
        payload.order_currency,
        payload.customer_id,
    )
    final_amount = payload.order_amount - discount_amount
    return DiscountApplyResponse(
        discount=serialize_discount(discount),
        discount_amount=discount_amount,
        discount_currency=payload.order_currency,
        final_amount=final_amount,
    )


def serialize_discount(discount: Discount) -> DiscountRead:
    """Serialize discount model to schema."""
    # Convert product_ids from JSON array of strings to list of UUIDs
    product_ids = None
    if discount.product_ids:
        from uuid import UUID
        try:
            product_ids = [UUID(pid) for pid in discount.product_ids]
        except (ValueError, TypeError):
            # Fallback to product_id if product_ids is invalid
            product_ids = [discount.product_id] if discount.product_id else None
    
    return DiscountRead(
        id=discount.id,
        code=discount.code,
        name=discount.name,
        description=discount.description,
        discount_type=discount.discount_type,
        discount_value=discount.discount_value,
        discount_currency=discount.discount_currency,
        scope=discount.scope,
        product_id=discount.product_id,  # For backward compatibility
        product_ids=product_ids,
        category_id=discount.category_id,
        valid_from=discount.valid_from,
        valid_until=discount.valid_until,
        max_uses=discount.max_uses,
        max_uses_per_customer=discount.max_uses_per_customer,
        minimum_order_amount=discount.minimum_order_amount,
        minimum_order_currency=discount.minimum_order_currency,
        is_active=discount.is_active,
        status=discount.status,
        current_uses=discount.current_uses,
        audit={
            "created_by": discount.created_by,
            "created_date": discount.created_date,
            "modified_by": discount.modified_by,
            "modified_date": discount.modified_date,
        },
    )

