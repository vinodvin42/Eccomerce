"""SQLAlchemy base and common mixins."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column


class Base(DeclarativeBase):
    """Declarative base class."""

    pass


class AuditMixin:
    """Common audit columns required by policy."""

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    created_date: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    modified_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    modified_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class TenantMixin:
    """Ensures every row carries tenant context."""

    @declared_attr.directive
    def tenant_id(cls) -> Mapped[uuid.UUID]:  # type: ignore[override]
        return mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    @declared_attr.directive
    def __table_args__(cls) -> dict[str, Any]:  # type: ignore[override]
        return {"info": {"multi_tenant": True}}

