"""Shipping method service layer."""

from __future__ import annotations

from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.shipping_method import ShippingMethod
from app.schemas.shipping_method import ShippingMethodCreate, ShippingMethodUpdate


class ShippingMethodService:
    """Encapsulates shipping method operations with tenant isolation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_shipping_methods(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 100,
        is_active: bool | None = None,
    ) -> tuple[Sequence[ShippingMethod], int]:
        """List shipping methods for a tenant."""
        query = select(ShippingMethod).where(ShippingMethod.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(ShippingMethod).where(ShippingMethod.tenant_id == tenant_id)

        if is_active is not None:
            query = query.where(ShippingMethod.is_active == is_active)
            count_stmt = count_stmt.where(ShippingMethod.is_active == is_active)

        query = query.order_by(ShippingMethod.name).offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        items = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return items, total

    async def get_shipping_method(self, tenant_id: UUID, shipping_method_id: UUID) -> ShippingMethod:
        """Get shipping method by ID with tenant isolation."""
        result = await self.session.execute(
            select(ShippingMethod).where(
                ShippingMethod.id == shipping_method_id, ShippingMethod.tenant_id == tenant_id
            )
        )
        shipping_method = result.scalar_one_or_none()
        if not shipping_method:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipping method not found")
        return shipping_method

    async def create_shipping_method(
        self, tenant_id: UUID, actor_id: UUID, payload: ShippingMethodCreate
    ) -> ShippingMethod:
        """Create a new shipping method."""
        shipping_method = ShippingMethod(
            tenant_id=tenant_id,
            name=payload.name,
            description=payload.description,
            estimated_days_min=payload.estimated_days_min,
            estimated_days_max=payload.estimated_days_max,
            base_cost_currency=payload.base_cost.currency,
            base_cost_amount=payload.base_cost.amount,
            cost_per_kg_currency=payload.cost_per_kg.currency if payload.cost_per_kg else None,
            cost_per_kg_amount=payload.cost_per_kg.amount if payload.cost_per_kg else None,
            is_active=payload.is_active,
            requires_signature=payload.requires_signature,
            is_express=payload.is_express,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(shipping_method)
        await self.session.commit()
        await self.session.refresh(shipping_method)
        return shipping_method

    async def update_shipping_method(
        self, tenant_id: UUID, shipping_method_id: UUID, actor_id: UUID, payload: ShippingMethodUpdate
    ) -> ShippingMethod:
        """Update an existing shipping method."""
        shipping_method = await self.get_shipping_method(tenant_id, shipping_method_id)

        if payload.name is not None:
            shipping_method.name = payload.name
        if payload.description is not None:
            shipping_method.description = payload.description
        if payload.estimated_days_min is not None:
            shipping_method.estimated_days_min = payload.estimated_days_min
        if payload.estimated_days_max is not None:
            shipping_method.estimated_days_max = payload.estimated_days_max
        if payload.base_cost is not None:
            shipping_method.base_cost_currency = payload.base_cost.currency
            shipping_method.base_cost_amount = payload.base_cost.amount
        if payload.cost_per_kg is not None:
            shipping_method.cost_per_kg_currency = payload.cost_per_kg.currency
            shipping_method.cost_per_kg_amount = payload.cost_per_kg.amount
        elif payload.cost_per_kg is False:  # Explicitly set to None
            shipping_method.cost_per_kg_currency = None
            shipping_method.cost_per_kg_amount = None
        if payload.is_active is not None:
            shipping_method.is_active = payload.is_active
        if payload.requires_signature is not None:
            shipping_method.requires_signature = payload.requires_signature
        if payload.is_express is not None:
            shipping_method.is_express = payload.is_express

        shipping_method.modified_by = actor_id

        await self.session.commit()
        await self.session.refresh(shipping_method)
        return shipping_method

