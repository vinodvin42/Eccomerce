"""Tenant persistence model."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import AuditMixin, Base


class TenantStatus(str, enum.Enum):
    active = "Active"
    suspended = "Suspended"


class Tenant(AuditMixin, Base):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(length=255), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(length=128), nullable=False, unique=True)
    status: Mapped[TenantStatus] = mapped_column(
        Enum(TenantStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=TenantStatus.active,
    )
    primary_contact: Mapped[str] = mapped_column(String(length=255), nullable=False)

