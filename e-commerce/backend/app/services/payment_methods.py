"""Payment method service layer."""

from __future__ import annotations

from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.payment_method import PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate


class PaymentMethodService:
    """Encapsulates payment method operations with tenant isolation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_payment_methods(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 100,
        is_active: bool | None = None,
    ) -> tuple[Sequence[PaymentMethod], int]:
        """List payment methods for a tenant."""
        query = select(PaymentMethod).where(PaymentMethod.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(PaymentMethod).where(PaymentMethod.tenant_id == tenant_id)

        if is_active is not None:
            query = query.where(PaymentMethod.is_active == is_active)
            count_stmt = count_stmt.where(PaymentMethod.is_active == is_active)

        query = query.order_by(PaymentMethod.name).offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        items = result.scalars().all()

        total = (await self.session.execute(count_stmt)).scalar_one()
        return items, total

    async def get_payment_method(self, tenant_id: UUID, payment_method_id: UUID) -> PaymentMethod:
        """Get payment method by ID with tenant isolation."""
        result = await self.session.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == payment_method_id, PaymentMethod.tenant_id == tenant_id
            )
        )
        payment_method = result.scalar_one_or_none()
        if not payment_method:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found")
        return payment_method

    async def create_payment_method(
        self, tenant_id: UUID, actor_id: UUID, payload: PaymentMethodCreate
    ) -> PaymentMethod:
        """Create a new payment method."""
        payment_method = PaymentMethod(
            tenant_id=tenant_id,
            name=payload.name,
            type=payload.type,
            description=payload.description,
            is_active=payload.is_active,
            requires_processing=payload.requires_processing,
            processing_fee_percentage=payload.processing_fee_percentage,
            processing_fee_fixed=payload.processing_fee_fixed,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(payment_method)
        await self.session.commit()
        await self.session.refresh(payment_method)
        return payment_method

    async def update_payment_method(
        self, tenant_id: UUID, payment_method_id: UUID, actor_id: UUID, payload: PaymentMethodUpdate
    ) -> PaymentMethod:
        """Update an existing payment method."""
        payment_method = await self.get_payment_method(tenant_id, payment_method_id)

        if payload.name is not None:
            payment_method.name = payload.name
        if payload.type is not None:
            payment_method.type = payload.type
        if payload.description is not None:
            payment_method.description = payload.description
        if payload.is_active is not None:
            payment_method.is_active = payload.is_active
        if payload.requires_processing is not None:
            payment_method.requires_processing = payload.requires_processing
        if payload.processing_fee_percentage is not None:
            payment_method.processing_fee_percentage = payload.processing_fee_percentage
        if payload.processing_fee_fixed is not None:
            payment_method.processing_fee_fixed = payload.processing_fee_fixed

        payment_method.modified_by = actor_id

        await self.session.commit()
        await self.session.refresh(payment_method)
        return payment_method

