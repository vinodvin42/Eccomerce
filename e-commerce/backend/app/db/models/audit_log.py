"""Audit log model for tracking entity changes."""

from __future__ import annotations

import enum
import uuid

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditAction(str, enum.Enum):
    """Types of audit actions."""

    create = "CREATE"
    update = "UPDATE"
    delete = "DELETE"
    view = "VIEW"


class AuditLog(Base):
    """Audit log entries for tracking entity changes."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(length=100), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    action: Mapped[AuditAction] = mapped_column(String(length=20), nullable=False, index=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    changes: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of changes
    ip_address: Mapped[str | None] = mapped_column(String(length=45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(length=500), nullable=True)
    created_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

