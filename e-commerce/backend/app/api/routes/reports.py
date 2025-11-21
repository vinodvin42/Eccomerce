"""Reports and analytics endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import RequireTenantAdmin
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.user import User
from app.db.session import get_session
from app.schemas.reports import DashboardResponse
from app.services.reports import ReportsService

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    start_date: datetime | None = Query(None, description="Start date for analytics period"),
    end_date: datetime | None = Query(None, description="End date for analytics period"),
    period: str = Query("day", description="Period grouping: day, week, or month"),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Get comprehensive dashboard analytics."""
    # Tenant admins can only see their tenant's data
    if current_user.role.value == "TenantAdmin" and tenant.tenant_id != current_user.tenant_id:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view reports for your tenant",
        )

    service = ReportsService(session)
    data = await service.get_dashboard_data(
        tenant_id=tenant.tenant_id,
        start_date=start_date,
        end_date=end_date,
        period=period,
    )

    return DashboardResponse(**data)


@router.get("/sales-summary")
async def get_sales_summary(
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Get sales summary statistics."""
    service = ReportsService(session)
    return await service.get_sales_summary(
        tenant_id=tenant.tenant_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/product-stats")
async def get_product_stats(
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Get product statistics."""
    service = ReportsService(session)
    return await service.get_product_stats(tenant_id=tenant.tenant_id)


@router.get("/order-stats")
async def get_order_stats(
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Get order statistics."""
    service = ReportsService(session)
    return await service.get_order_stats(tenant_id=tenant.tenant_id)


@router.get("/top-products")
async def get_top_products(
    limit: int = Query(10, ge=1, le=50),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Get top selling products."""
    service = ReportsService(session)
    return await service.get_top_products(
        tenant_id=tenant.tenant_id,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
    )

