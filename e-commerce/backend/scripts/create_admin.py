"""Create admin user for testing."""

from __future__ import annotations

import asyncio
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import get_settings
from app.db.models.user import User, UserRole
from app.services.auth import AuthService

settings = get_settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def create_admin() -> None:
    """Create admin user if it doesn't exist."""
    async with async_session() as session:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == "admin@manoj-commerce.com")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"✅ Admin user already exists: {existing_user.email}")
            return
        
        auth_service = AuthService(session)
        super_admin_id = uuid4()
        
        try:
            super_admin = await auth_service.create_local_user(
                email="admin@manoj-commerce.com",
                username="admin@manoj-commerce.com",
                password="Admin123!@#",
                full_name="Super Administrator",
                role=UserRole.super_admin,
                tenant_id=None,
                actor_id=super_admin_id,
            )
            await session.commit()
            print(f"✅ Created super admin: {super_admin.email}")
        except Exception as e:
            print(f"⚠️  Error creating admin: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()


if __name__ == "__main__":
    asyncio.run(create_admin())

