"""Database engine and session management."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.utils import ensure_async_database_url

settings = get_settings()

async_database_url = ensure_async_database_url(settings.database_url)
engine = create_async_engine(async_database_url, pool_pre_ping=True)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncSession:
    """FastAPI dependency for DB session."""

    async with async_session() as session:
        yield session

