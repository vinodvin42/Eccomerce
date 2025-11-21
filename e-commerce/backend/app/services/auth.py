"""Authentication service for local and OIDC providers."""

from __future__ import annotations

from uuid import UUID, uuid4

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import TokenData, create_access_token
from app.core.config import get_settings
from app.db.models.user import AuthProvider, User, UserRole, UserStatus
from app.schemas.auth import LoginRequest, TokenResponse

settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash password for storage."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


class AuthService:
    """Handles authentication for local and external providers."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def authenticate_local(self, login: LoginRequest) -> User | None:
        """Authenticate local user by username/password."""
        result = await self.session.execute(
            select(User).where(
                User.username == login.username,
                User.auth_provider == AuthProvider.local.value,
            )
        )
        user = result.scalar_one_or_none()

        if not user or not user.hashed_password:
            return None

        if not verify_password(login.password, user.hashed_password):
            return None

        if user.status != UserStatus.active:
            return None

        return user

    async def authenticate_okta(self, okta_token: str) -> User | None:
        """Authenticate via Okta OIDC token (stub for Phase 1)."""
        # TODO: Implement Okta token validation in Phase 2
        # For now, return None to indicate Okta not configured
        return None

    async def create_token_response(self, user: User) -> TokenResponse:
        """Generate JWT token for authenticated user."""
        from datetime import timedelta

        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
        if user.tenant_id:
            token_data["tenant_id"] = str(user.tenant_id)

        access_token = create_access_token(token_data, expires_delta=timedelta(minutes=settings.access_token_expire_minutes))
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def create_local_user(
        self,
        email: str,
        username: str,
        password: str,
        full_name: str,
        role: UserRole,
        tenant_id: UUID | None,
        actor_id: UUID,
    ) -> User:
        """Create a new local user account."""
        # Check if user exists
        result = await self.session.execute(
            select(User).where((User.email == email) | (User.username == username))
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise ValueError("User with this email or username already exists")

        user = User(
            id=uuid4(),
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
            tenant_id=tenant_id,
            auth_provider=AuthProvider.local,
            status=UserStatus.active,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

