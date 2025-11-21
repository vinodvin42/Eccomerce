"""Authentication request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login credentials."""

    username: str = Field(..., min_length=1, max_length=128)
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class RegisterRequest(BaseModel):
    """User registration request."""

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=128)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=3, max_length=255)


class UserResponse(BaseModel):
    """User profile response."""

    id: str
    email: str
    username: str
    full_name: str
    role: str
    tenant_id: str | None = None

    class Config:
        from_attributes = True

