"""Redis caching utilities."""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as redis
import structlog

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger(__name__)

# Global Redis connection pool
_redis_pool: redis.ConnectionPool | None = None


async def get_redis_client() -> redis.Redis:
    """Get Redis client with connection pooling."""
    global _redis_pool

    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=20,
        )

    return redis.Redis(connection_pool=_redis_pool)


class CacheService:
    """Service for caching operations."""

    def __init__(self) -> None:
        self._client: redis.Redis | None = None

    async def get_client(self) -> redis.Redis:
        """Get Redis client."""
        if self._client is None:
            self._client = await get_redis_client()
        return self._client

    async def get(self, key: str) -> Any | None:
        """Get value from cache."""
        try:
            client = await self.get_client()
            value = await client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning("cache_get_failed", key=key, error=str(e))
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600,
    ) -> bool:
        """Set value in cache with TTL."""
        try:
            client = await self.get_client()
            await client.setex(
                key,
                ttl,
                json.dumps(value, default=str),
            )
            return True
        except Exception as e:
            logger.warning("cache_set_failed", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            client = await self.get_client()
            await client.delete(key)
            return True
        except Exception as e:
            logger.warning("cache_delete_failed", key=key, error=str(e))
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            client = await self.get_client()
            keys = await client.keys(pattern)
            if keys:
                return await client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning("cache_delete_pattern_failed", pattern=pattern, error=str(e))
            return 0

    async def invalidate_product(self, tenant_id: str, product_id: str | None = None) -> None:
        """Invalidate product cache."""
        if product_id:
            await self.delete(f"product:{tenant_id}:{product_id}")
        await self.delete_pattern(f"products:{tenant_id}:*")

    async def invalidate_user(self, tenant_id: str, user_id: str | None = None) -> None:
        """Invalidate user cache."""
        if user_id:
            await self.delete(f"user:{tenant_id}:{user_id}")
        await self.delete_pattern(f"users:{tenant_id}:*")


# Global cache service instance
cache_service = CacheService()

