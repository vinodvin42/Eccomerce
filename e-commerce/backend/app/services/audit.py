"""Audit log service."""

from __future__ import annotations

import json
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_log import AuditAction, AuditLog


class AuditService:
    """Service for audit log operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log_action(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        action: AuditAction,
        actor_id: UUID,
        changes: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        """Create an audit log entry."""
        audit_log = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            tenant_id=tenant_id,
            action=action,
            actor_id=actor_id,
            changes=json.dumps(changes) if changes else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(audit_log)
        await self.session.commit()
        await self.session.refresh(audit_log)
        return audit_log

    async def list_audit_logs(
        self,
        tenant_id: UUID | None = None,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        action: AuditAction | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[Sequence[AuditLog], int]:
        """List audit logs with filtering."""
        query = select(AuditLog)
        count_stmt = select(func.count()).select_from(AuditLog)

        if tenant_id:
            query = query.where(AuditLog.tenant_id == tenant_id)
            count_stmt = count_stmt.where(AuditLog.tenant_id == tenant_id)

        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)
            count_stmt = count_stmt.where(AuditLog.entity_type == entity_type)

        if entity_id:
            query = query.where(AuditLog.entity_id == entity_id)
            count_stmt = count_stmt.where(AuditLog.entity_id == entity_id)

        if action:
            query = query.where(AuditLog.action == action)
            count_stmt = count_stmt.where(AuditLog.action == action)

        query = query.order_by(AuditLog.created_date.desc()).offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        logs = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return logs, total

    async def get_entity_audit_history(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
    ) -> Sequence[AuditLog]:
        """Get full audit history for an entity."""
        query = (
            select(AuditLog)
            .where(
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id,
                AuditLog.tenant_id == tenant_id,
            )
            .order_by(AuditLog.created_date.desc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()

