"""Tenant context resolution."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID, uuid4

from fastapi import Depends, Header, HTTPException, status


@dataclass(slots=True, frozen=True)
class TenantContext:
    tenant_id: UUID
    correlation_id: str | None = None


async def get_tenant_context(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_correlation_id: str | None = Header(default=None, alias="X-Correlation-ID"),
) -> TenantContext:
    """Resolve tenant context from headers, enforcing UUID format."""

    try:
        tenant_uuid = UUID(x_tenant_id)
    except ValueError as exc:  # pragma: no cover - validation path
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Tenant-ID header.",
        ) from exc

    correlation_id = x_correlation_id or str(uuid4())
    return TenantContext(tenant_id=tenant_uuid, correlation_id=correlation_id)

