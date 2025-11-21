"""User management service."""

from __future__ import annotations

from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import publish_user_updated
from app.db.models.user import User, UserRole, UserStatus
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth import get_password_hash


class UserService:
    """Handles user management operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_users(
        self,
        tenant_id: UUID | None = None,
        role: UserRole | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[User], int]:
        """List users with optional filtering."""
        query = select(User)
        count_stmt = select(func.count()).select_from(User)

        if tenant_id:
            query = query.where(User.tenant_id == tenant_id)
            count_stmt = count_stmt.where(User.tenant_id == tenant_id)

        if role:
            query = query.where(User.role == role)
            count_stmt = count_stmt.where(User.role == role)

        query = query.order_by(User.created_date.desc()).offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        users = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return users, total

    async def get_user(self, user_id: UUID) -> User:
        """Get user by ID."""
        result = await self.session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    async def create_user(self, actor_id: UUID, payload: UserCreate) -> User:
        """Create a new user."""
        # Check if user exists
        result = await self.session.execute(
            select(User).where((User.email == payload.email) | (User.username == payload.username))
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email or username already exists",
            )

        user = User(
            email=payload.email,
            username=payload.username,
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name,
            role=payload.role,
            tenant_id=payload.tenant_id,
            status=UserStatus.active,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update_user(self, user_id: UUID, actor_id: UUID, payload: UserUpdate) -> User:
        """Update user."""
        user = await self.get_user(user_id)
        changes = {}

        if payload.email is not None:
            # Check if email is already taken by another user
            result = await self.session.execute(
                select(User).where(User.email == payload.email, User.id != user_id)
            )
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already in use",
                )
            changes["email"] = {"old": user.email, "new": payload.email}
            user.email = payload.email

        if payload.username is not None:
            # Check if username is already taken by another user
            result = await self.session.execute(
                select(User).where(User.username == payload.username, User.id != user_id)
            )
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already in use",
                )
            changes["username"] = {"old": user.username, "new": payload.username}
            user.username = payload.username

        if payload.full_name is not None:
            changes["full_name"] = {"old": user.full_name, "new": payload.full_name}
            user.full_name = payload.full_name

        if payload.role is not None:
            changes["role"] = {"old": user.role.value if user.role else None, "new": payload.role.value}
            user.role = payload.role

        if payload.status is not None:
            changes["status"] = {"old": user.status.value if user.status else None, "new": payload.status.value}
            user.status = payload.status

        if payload.mfa_enabled is not None:
            changes["mfa_enabled"] = {"old": user.mfa_enabled, "new": payload.mfa_enabled}
            user.mfa_enabled = payload.mfa_enabled

        user.modified_by = actor_id
        await self.session.commit()
        await self.session.refresh(user)

        # Publish user.updated event if there were changes
        if changes and user.tenant_id:
            publish_user_updated(
                user_id=user.id,
                tenant_id=user.tenant_id,
                changes=changes,
            )

        return user

    async def delete_user(self, user_id: UUID) -> None:
        """Delete user (soft delete by setting status to inactive)."""
        user = await self.get_user(user_id)
        user.status = UserStatus.inactive
        await self.session.commit()

