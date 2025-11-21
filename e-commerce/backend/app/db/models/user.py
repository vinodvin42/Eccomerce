"""User persistence model."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import AuditMixin, Base


class UserRole(str, enum.Enum):
    """RBAC roles for authorization."""

    super_admin = "SuperAdmin"  # Platform-level admin
    tenant_admin = "TenantAdmin"  # Tenant-level admin
    staff = "Staff"  # Regular staff member
    customer = "Customer"  # End customer


class UserStatus(str, enum.Enum):
    """User account status."""

    active = "Active"
    suspended = "Suspended"
    locked = "Locked"


class AuthProvider(str, enum.Enum):
    """Authentication provider source."""

    local = "Local"  # Database-stored credentials
    okta = "Okta"  # Okta OIDC
    azure_ad = "AzureAD"  # Azure AD


class User(AuditMixin, Base):
    """User account with multi-tenant support."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(length=255), nullable=False, unique=True, index=True)
    username: Mapped[str] = mapped_column(String(length=128), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(length=255), nullable=True)  # None for OIDC users
    full_name: Mapped[str] = mapped_column(String(length=255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False, default=UserRole.customer)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=UserStatus.active)
    auth_provider: Mapped[AuthProvider] = mapped_column(Enum(AuthProvider, values_callable=lambda x: [e.value for e in x]), nullable=False, default=AuthProvider.local)
    external_id: Mapped[str | None] = mapped_column(String(length=255), nullable=True)  # Okta/AD user ID
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )  # None for super_admin, required for others
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_login: Mapped[str | None] = mapped_column(String(length=255), nullable=True)  # ISO timestamp

