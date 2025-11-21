"""Database utility functions."""

from __future__ import annotations


def ensure_async_database_url(url: str) -> str:
    """Ensure the database URL uses asyncpg driver for async SQLAlchemy.
    
    This function converts standard PostgreSQL URLs to use the asyncpg driver
    required by SQLAlchemy's async engine. This is especially useful when
    deploying to platforms like Render that provide standard postgresql:// URLs.
    
    Args:
        url: Database URL (e.g., postgresql://user:pass@host/db)
        
    Returns:
        URL with asyncpg driver (e.g., postgresql+asyncpg://user:pass@host/db)
    """
    # Convert postgresql:// to postgresql+asyncpg://
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Convert postgresql+psycopg2:// to postgresql+asyncpg://
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    # Already has asyncpg or other driver, return as-is
    return url

