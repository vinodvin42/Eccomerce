"""Authentication endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_active_user
from app.db.models.user import User, UserRole
from app.db.session import get_session
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Authenticate user and return JWT token."""
    auth_service = AuthService(session)
    user = await auth_service.authenticate_local(login_data)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    return await auth_service.create_token_response(user)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    """Register a new customer account."""
    auth_service = AuthService(session)

    # Create customer user (default role is Customer)
    try:
        # For customer registration, we need a system actor ID
        # In production, this would come from a system service account
        system_actor_id = UUID("00000000-0000-0000-0000-000000000000")  # System UUID

        user = await auth_service.create_local_user(
            email=register_data.email,
            username=register_data.username,
            password=register_data.password,
            full_name=register_data.full_name,
            role=UserRole.customer,
            tenant_id=None,  # Customers can be created without tenant initially
            actor_id=system_actor_id,
        )

        user_response = UserResponse(
            id=str(user.id),
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role.value,
            tenant_id=str(user.tenant_id) if user.tenant_id else None,
        )

        # Publish user.registered event
        from app.core.events import publish_user_registered

        publish_user_registered(
            user_id=user.id,
            email=user.email,
            tenant_id=user.tenant_id,
            role=user.role.value,
        )

        # Send welcome email (async)
        from app.services.notifications import NotificationService

        NotificationService.send_welcome_email(
            user_email=user.email,
            user_name=user.full_name,
            tenant_id=user.tenant_id,
        )

        return user_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """Get current authenticated user profile."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role.value,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
    )
