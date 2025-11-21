"""Return workflow service."""

from __future__ import annotations

from decimal import Decimal
from typing import Sequence
from uuid import UUID

import structlog
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.events import publish_return_completed
from app.db.models.order import Order, OrderStatus
from app.db.models.payment_transaction import PaymentTransaction, PaymentStatus
from app.db.models.return_request import ReturnRequest, ReturnStatus
from app.db.models.user import User, UserRole
from app.schemas.returns import ReturnCreate
from app.services.payments import PaymentService

logger = structlog.get_logger(__name__)


class ReturnService:
    """Encapsulates return ticket lifecycle."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_return_request(
        self,
        tenant_id: UUID,
        actor_id: UUID,
        payload: ReturnCreate,
        requester: User,
    ) -> ReturnRequest:
        order = await self._get_order(tenant_id, payload.order_id)

        if order.status != OrderStatus.confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only confirmed orders can be returned.",
            )

        if requester.role == UserRole.customer and order.customer_id != requester.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create returns for your own orders.",
            )

        existing = await self.session.execute(
            select(ReturnRequest).where(
                ReturnRequest.tenant_id == tenant_id,
                ReturnRequest.order_id == order.id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Return request already exists for this order.",
            )

        return_request = ReturnRequest(
            tenant_id=tenant_id,
            order_id=order.id,
            customer_id=order.customer_id,
            reason=payload.reason,
            status=ReturnStatus.pending,
            created_by=actor_id,
            modified_by=actor_id,
        )
        self.session.add(return_request)
        await self.session.commit()
        return await self.get_return(tenant_id, return_request.id)

    async def list_returns(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status_filter: ReturnStatus | None = None,
        customer_id: UUID | None = None,
    ) -> tuple[Sequence[ReturnRequest], int]:
        query = select(ReturnRequest).where(ReturnRequest.tenant_id == tenant_id)
        count_query = select(func.count()).select_from(ReturnRequest).where(ReturnRequest.tenant_id == tenant_id)

        if status_filter:
            query = query.where(ReturnRequest.status == status_filter)
            count_query = count_query.where(ReturnRequest.status == status_filter)

        if customer_id:
            query = query.where(ReturnRequest.customer_id == customer_id)
            count_query = count_query.where(ReturnRequest.customer_id == customer_id)

        query = (
            query.order_by(ReturnRequest.created_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(
                selectinload(ReturnRequest.order).selectinload(Order.items),
                selectinload(ReturnRequest.customer),
            )
        )

        result = await self.session.execute(query)
        items = result.scalars().all()
        total = (await self.session.execute(count_query)).scalar_one()
        return items, total

    async def approve_return(
        self,
        tenant_id: UUID,
        return_id: UUID,
        actor_id: UUID,
        resolution_notes: str | None = None,
        auto_refund: bool = False,
        refund_amount: Decimal | None = None,
    ) -> ReturnRequest:
        return_request = await self.get_return(tenant_id, return_id)

        if return_request.status not in (ReturnStatus.pending, ReturnStatus.rejected):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve a return in status {return_request.status.value}.",
            )

        return_request.status = ReturnStatus.approved
        return_request.resolution_notes = resolution_notes
        return_request.modified_by = actor_id
        await self.session.commit()

        hydrated = await self.get_return(tenant_id, return_request.id)

        if auto_refund:
            return await self.refund_return(
                tenant_id=tenant_id,
                return_id=return_id,
                actor_id=actor_id,
                amount=refund_amount,
                reason="Auto refund on approval",
            )

        return hydrated

    async def reject_return(
        self,
        tenant_id: UUID,
        return_id: UUID,
        actor_id: UUID,
        resolution_notes: str | None = None,
    ) -> ReturnRequest:
        return_request = await self.get_return(tenant_id, return_id)
        if return_request.status == ReturnStatus.refunded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject a refunded return.",
            )

        return_request.status = ReturnStatus.rejected
        return_request.resolution_notes = resolution_notes
        return_request.modified_by = actor_id
        await self.session.commit()
        return await self.get_return(tenant_id, return_request.id)

    async def refund_return(
        self,
        tenant_id: UUID,
        return_id: UUID,
        actor_id: UUID,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> ReturnRequest:
        return_request = await self.get_return(tenant_id, return_id)

        if return_request.status == ReturnStatus.refunded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Return already refunded.",
            )

        if return_request.status not in (ReturnStatus.approved, ReturnStatus.pending):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending or approved returns can be refunded.",
            )

        payment_transaction = await self._get_latest_successful_transaction(
            tenant_id, return_request.order_id
        )
        if not payment_transaction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No successful payment transaction found to refund.",
            )

        payment_service = PaymentService(self.session)
        transaction = await payment_service.refund_payment(
            tenant_id=tenant_id,
            transaction_id=payment_transaction.id,
            actor_id=actor_id,
            amount=amount,
            reason=reason or f"Return #{return_id}",
        )

        return_request.status = ReturnStatus.refunded
        return_request.modified_by = actor_id
        return_request.refund_transaction_id = transaction.id
        return_request.refund_amount = transaction.refund_amount
        return_request.refund_currency = transaction.amount_currency
        await self.session.commit()

        publish_return_completed(
            return_id=return_request.id,
            tenant_id=tenant_id,
            order_id=return_request.order_id,
            refund_amount=float(return_request.refund_amount) if return_request.refund_amount else None,
            currency=return_request.refund_currency,
        )

        return await self.get_return(tenant_id, return_request.id)

    async def get_return(self, tenant_id: UUID, return_id: UUID) -> ReturnRequest:
        result = await self.session.execute(
            select(ReturnRequest)
            .where(ReturnRequest.id == return_id, ReturnRequest.tenant_id == tenant_id)
            .options(
                selectinload(ReturnRequest.order).selectinload(Order.items),
                selectinload(ReturnRequest.customer),
            )
        )
        return_request = result.scalar_one_or_none()
        if not return_request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found.")
        return return_request

    async def _get_order(self, tenant_id: UUID, order_id: UUID) -> Order:
        result = await self.session.execute(
            select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
        return order

    async def _get_latest_successful_transaction(
        self, tenant_id: UUID, order_id: UUID
    ) -> PaymentTransaction | None:
        result = await self.session.execute(
            select(PaymentTransaction)
            .where(
                PaymentTransaction.tenant_id == tenant_id,
                PaymentTransaction.order_id == order_id,
                PaymentTransaction.status.in_([PaymentStatus.succeeded, PaymentStatus.partially_refunded]),
            )
            .order_by(PaymentTransaction.created_date.desc())
        )
        return result.scalars().first()

