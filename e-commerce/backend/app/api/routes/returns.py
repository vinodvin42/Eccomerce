"""Return request API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_active_user
from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from app.db.models.return_request import ReturnRequest, ReturnStatus
from app.db.models.user import User, UserRole
from app.db.session import get_session
from app.schemas.returns import (
    ReturnCreate,
    ReturnDecisionRequest,
    ReturnListResponse,
    ReturnRead,
    ReturnRefundRequest,
)
from app.services.returns import ReturnService

router = APIRouter(prefix="/api/v1/returns", tags=["Returns"])


@router.post("", response_model=ReturnRead, status_code=status.HTTP_202_ACCEPTED)
async def create_return_request(
    payload: ReturnCreate,
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_active_user),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
) -> ReturnRead:
    """Create a return request for an order."""
    service = ReturnService(session)
    return_request = await service.create_return_request(tenant.tenant_id, actor_id, payload, current_user)
    return serialize_return(return_request)


@router.get("", response_model=ReturnListResponse)
async def list_returns(
    tenant: TenantContext = Depends(get_tenant_context),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ReturnListResponse:
    """List return requests."""
    service = ReturnService(session)

    customer_id = None
    if current_user.role == UserRole.customer:
        customer_id = current_user.id

    parsed_status = None
    if status_filter:
        normalized = status_filter.strip().upper()
        try:
            parsed_status = ReturnStatus(normalized.title())
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")

    items, total = await service.list_returns(
        tenant_id=tenant.tenant_id,
        page=page,
        page_size=page_size,
        status_filter=parsed_status,
        customer_id=customer_id,
    )
    return ReturnListResponse(
        items=[serialize_return(item) for item in items],
        total=total,
        page=page,
        pageSize=page_size,
    )


@router.post("/{return_id}/approve", response_model=ReturnRead)
async def approve_return(
    return_id: UUID,
    payload: ReturnDecisionRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_active_user),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
) -> ReturnRead:
    """Approve a return request."""
    _ensure_staff(current_user)
    service = ReturnService(session)
    return_request = await service.approve_return(
        tenant_id=tenant.tenant_id,
        return_id=return_id,
        actor_id=actor_id,
        resolution_notes=payload.resolution_notes,
        auto_refund=payload.auto_refund,
        refund_amount=payload.refund_amount,
    )
    return serialize_return(return_request)


@router.post("/{return_id}/reject", response_model=ReturnRead)
async def reject_return(
    return_id: UUID,
    payload: ReturnDecisionRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_active_user),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
) -> ReturnRead:
    """Reject a return request."""
    _ensure_staff(current_user)
    service = ReturnService(session)
    return_request = await service.reject_return(
        tenant_id=tenant.tenant_id,
        return_id=return_id,
        actor_id=actor_id,
        resolution_notes=payload.resolution_notes,
    )
    return serialize_return(return_request)


@router.post("/{return_id}/refund", response_model=ReturnRead)
async def refund_return(
    return_id: UUID,
    payload: ReturnRefundRequest,
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_active_user),
    actor_id: UUID = Depends(get_request_actor),
    session: AsyncSession = Depends(get_session),
) -> ReturnRead:
    """Process a refund for a return request."""
    _ensure_staff(current_user)
    service = ReturnService(session)
    return_request = await service.refund_return(
        tenant_id=tenant.tenant_id,
        return_id=return_id,
        actor_id=actor_id,
        amount=payload.amount,
        reason=payload.reason,
    )
    return serialize_return(return_request)


def serialize_return(return_request: ReturnRequest) -> ReturnRead:
    """Convert model to schema."""
    customer = None
    if return_request.customer:
        customer = {
            "id": return_request.customer.id,
            "name": return_request.customer.full_name,
            "email": return_request.customer.email,
            "role": return_request.customer.role.value if return_request.customer.role else None,
        }

    order_data = None
    if return_request.order:
        order_items = []
        for item in return_request.order.items:
            unit_amount = float(item.unit_price_amount)
            order_items.append(
                {
                    "productId": item.product_id,
                    "productName": item.product.name if item.product else None,
                    "sku": item.product.sku if item.product else None,
                    "imageUrl": item.product.image_url if item.product else None,
                    "quantity": item.quantity,
                    "unitPrice": {
                        "currency": item.unit_price_currency,
                        "amount": unit_amount,
                    },
                    "lineTotal": {
                        "currency": item.unit_price_currency,
                        "amount": unit_amount * item.quantity,
                    },
                }
            )

        order_data = {
            "id": return_request.order.id,
            "status": return_request.order.status.value,
            "total": {
                "currency": return_request.order.total_currency,
                "amount": float(return_request.order.total_amount),
            },
            "placedAt": return_request.order.created_date,
            "shippingAddress": return_request.order.shipping_address,
            "itemCount": len(order_items),
            "items": order_items,
        }

    return ReturnRead(
        id=return_request.id,
        orderId=return_request.order_id,
        customerId=return_request.customer_id,
        reason=return_request.reason,
        resolutionNotes=return_request.resolution_notes,
        status=return_request.status,
        refundTransactionId=return_request.refund_transaction_id,
        refundAmount=return_request.refund_amount,
        refundCurrency=return_request.refund_currency,
        audit={
            "created_by": return_request.created_by,
            "created_date": return_request.created_date,
            "modified_by": return_request.modified_by,
            "modified_date": return_request.modified_date,
        },
        customer=customer,
        order=order_data,
    )


def _ensure_staff(user: User) -> None:
    if user.role == UserRole.customer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this action.",
        )

