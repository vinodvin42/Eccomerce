"""Audit log endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import RequireTenantAdmin
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.audit_log import AuditAction
from app.db.models.user import User
from app.db.session import get_session
from app.schemas.audit import AuditLogListResponse, AuditLogRead
from app.services.audit import AuditService

router = APIRouter(prefix="/api/v1/audit", tags=["Audit"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    tenant_id: UUID | None = Query(None, description="Filter by tenant ID"),
    entity_type: str | None = Query(None, description="Filter by entity type (e.g., Product, Order, User)"),
    entity_id: UUID | None = Query(None, description="Filter by specific entity ID"),
    action: AuditAction | None = Query(None, description="Filter by action type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """List audit logs. Tenant admins can only see logs for their tenant."""
    service = AuditService(session)

    # Tenant admins can only see their tenant's audit logs
    if current_user.role.value == "TenantAdmin":
        filter_tenant_id = current_user.tenant_id
    else:
        filter_tenant_id = tenant_id

    logs, total = await service.list_audit_logs(
        tenant_id=filter_tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        page=page,
        page_size=page_size,
    )

    return AuditLogListResponse(
        items=[serialize_audit_log(log) for log in logs],
        total=total,
        page=page,
        pageSize=page_size,
    )


@router.get("/entity/{entity_type}/{entity_id}", response_model=list[AuditLogRead])
async def get_entity_audit_history(
    entity_type: str,
    entity_id: UUID,
    current_user: User = RequireTenantAdmin,
    tenant: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    """Get full audit history for a specific entity."""
    from app.core.tenant import TenantContext
    from fastapi import HTTPException, status

    # Tenant admins can only see their tenant's audit logs
    if current_user.role.value == "TenantAdmin" and tenant.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view audit logs for your tenant",
        )

    service = AuditService(session)
    logs = await service.get_entity_audit_history(
        entity_type=entity_type,
        entity_id=entity_id,
        tenant_id=tenant.tenant_id,
    )

    return [serialize_audit_log(log) for log in logs]


def serialize_audit_log(log) -> AuditLogRead:
    """Serialize audit log to response schema."""
    import json

    changes = None
    if log.changes:
        try:
            changes = json.loads(log.changes)
        except json.JSONDecodeError:
            changes = {"raw": log.changes}

    return AuditLogRead(
        id=log.id,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        tenant_id=log.tenant_id,
        action=log.action,
        actor_id=log.actor_id,
        changes=changes,
        ip_address=log.ip_address,
        user_agent=log.user_agent,
        created_date=log.created_date,
    )

