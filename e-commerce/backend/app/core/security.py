"""Security helpers."""

from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException, status


async def get_request_actor(x_actor_id: str = Header(..., alias="X-Actor-ID")) -> UUID:
    """Extract the user/service principal performing the action."""

    try:
        return UUID(x_actor_id)
    except ValueError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Actor-ID header.",
        ) from exc

