"""Category API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.category import Category
from app.db.session import get_session
from app.schemas.category import CategoryCreate, CategoryListResponse, CategoryRead, CategoryUpdate
from app.services.categories import CategoryService

router = APIRouter(prefix="/api/v1/categories", tags=["Categories"])


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200, alias="pageSize"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """List categories for the tenant."""
    service = CategoryService(session)
    categories, total = await service.list_categories(
        tenant.tenant_id, page=page, page_size=page_size, is_active=is_active
    )
    return CategoryListResponse(
        items=[serialize_category(cat) for cat in categories],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{category_id}", response_model=CategoryRead)
async def get_category(
    category_id: UUID,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Get category by ID."""
    service = CategoryService(session)
    category = await service.get_category(tenant.tenant_id, category_id)
    return serialize_category(category)


@router.post("", response_model=CategoryRead, status_code=201)
async def create_category(
    payload: CategoryCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Create a new category."""
    service = CategoryService(session)
    category = await service.create_category(tenant.tenant_id, actor_id, payload)
    return serialize_category(category)


@router.put("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
):
    """Update an existing category."""
    service = CategoryService(session)
    category = await service.update_category(tenant.tenant_id, category_id, actor_id, payload)
    return serialize_category(category)


def serialize_category(category: Category) -> CategoryRead:
    return CategoryRead(
        id=category.id,
        tenantId=category.tenant_id,
        name=category.name,
        description=category.description,
        slug=category.slug,
        parentId=category.parent_id,
        isActive=category.is_active,
        audit={
            "createdBy": category.created_by,
            "createdDate": category.created_date,
            "modifiedBy": category.modified_by,
            "modifiedDate": category.modified_date,
        },
    )

