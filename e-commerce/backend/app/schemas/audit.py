"""Audit log schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.audit_log import AuditAction


class AuditLogRead(BaseModel):
    """Audit log entry response."""

    id: UUID
    entity_type: str
    entity_id: UUID
    tenant_id: UUID
    action: AuditAction
    actor_id: UUID
    changes: dict | None
    ip_address: str | None
    user_agent: str | None
    created_date: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Paginated audit log response."""

    items: list[AuditLogRead]
    total: int
    page: int
    pageSize: int

