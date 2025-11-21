"""User request/response schemas."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.db.models.user import AuthProvider, UserRole, UserStatus
from app.schemas.shared import AuditSchema


class UserCreate(BaseModel):
    """User creation request."""

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=128)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=3, max_length=255)
    role: UserRole = UserRole.customer
    tenant_id: UUID | None = None


class UserUpdate(BaseModel):
    """User update request."""

    email: EmailStr | None = None
    username: str | None = Field(None, min_length=3, max_length=128)
    full_name: str | None = Field(None, min_length=3, max_length=255)
    role: UserRole | None = None
    status: UserStatus | None = None
    mfa_enabled: bool | None = None


class UserRead(BaseModel):
    """User response schema."""

    id: UUID
    email: str
    username: str
    full_name: str
    role: UserRole
    status: UserStatus
    tenant_id: UUID | None
    auth_provider: AuthProvider
    mfa_enabled: bool
    last_login: str | None
    audit: AuditSchema

    class Config:
        from_attributes = True

