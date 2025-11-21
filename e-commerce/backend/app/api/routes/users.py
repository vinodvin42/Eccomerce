"""User management endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_active_user, RequireTenantAdmin
from app.db.models.user import User, UserRole
from app.db.session import get_session
from app.schemas.shared import AuditSchema
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.users import UserService

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("", response_model=dict)
async def list_users(
    tenant_id: UUID | None = Query(None, description="Filter by tenant ID"),
    role: UserRole | None = Query(None, description="Filter by role"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """List users. Tenant admins can only see users in their tenant."""
    service = UserService(session)

    # Tenant admins can only see their tenant's users
    if current_user.role == UserRole.tenant_admin:
        filter_tenant_id = current_user.tenant_id
    else:
        filter_tenant_id = tenant_id

    users, total = await service.list_users(
        tenant_id=filter_tenant_id,
        role=role,
        page=page,
        page_size=page_size,
    )

    return {
        "items": [serialize_user(user) for user in users],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: UUID,
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Get user by ID."""
    service = UserService(session)
    user = await service.get_user(user_id)

    # Tenant admins can only view users in their tenant
    if current_user.role == UserRole.tenant_admin and user.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view users in your tenant",
        )

    return serialize_user(user)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Create a new user. Tenant admins can only create users in their tenant."""
    service = UserService(session)

    # Tenant admins can only create users in their tenant
    if current_user.role == UserRole.tenant_admin:
        if payload.tenant_id and payload.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create users in your tenant",
            )
        payload.tenant_id = current_user.tenant_id

    user = await service.create_user(current_user.id, payload)
    return serialize_user(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Update user. Tenant admins can only update users in their tenant."""
    service = UserService(session)
    user = await service.get_user(user_id)

    # Tenant admins can only update users in their tenant
    if current_user.role == UserRole.tenant_admin and user.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update users in your tenant",
        )

    updated_user = await service.update_user(user_id, current_user.id, payload)
    return serialize_user(updated_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Delete user. Tenant admins can only delete users in their tenant."""
    service = UserService(session)
    user = await service.get_user(user_id)

    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    # Tenant admins can only delete users in their tenant
    if current_user.role == UserRole.tenant_admin and user.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete users in your tenant",
        )

    await service.delete_user(user_id)
    return None


def serialize_user(user: User) -> UserRead:
    """Serialize user model to response schema."""
    return UserRead(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        status=user.status,
        tenant_id=user.tenant_id,
        auth_provider=user.auth_provider,
        mfa_enabled=user.mfa_enabled,
        last_login=user.last_login,
        audit=AuditSchema(
            created_by=user.created_by,
            created_date=user.created_date,
            modified_by=user.modified_by,
            modified_date=user.modified_date,
        ),
    )

