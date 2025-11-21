"""Return request schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.return_request import ReturnStatus
from app.schemas.shared import AuditSchema, Money


class ReturnCreate(BaseModel):
    """Schema for creating a return request."""

    model_config = ConfigDict(populate_by_name=True)

    order_id: UUID = Field(alias="orderId")
    reason: str


class ReturnCustomer(BaseModel):
    """Lightweight customer context for a return."""

    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    name: str | None = None
    email: str | None = None
    role: str | None = None


class ReturnOrderItem(BaseModel):
    """Snapshot of an order line included in the return."""

    model_config = ConfigDict(populate_by_name=True)

    product_id: UUID = Field(alias="productId")
    product_name: str | None = Field(default=None, alias="productName")
    sku: str | None = None
    image_url: str | None = Field(default=None, alias="imageUrl")
    quantity: int
    unit_price: Money = Field(alias="unitPrice")
    line_total: Money = Field(alias="lineTotal")


class ReturnOrderSummary(BaseModel):
    """Order snapshot surfaced next to the return."""

    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    status: str
    total: Money
    placed_at: datetime = Field(alias="placedAt")
    shipping_address: str | None = Field(default=None, alias="shippingAddress")
    item_count: int = Field(alias="itemCount")
    items: list[ReturnOrderItem]


class ReturnRead(BaseModel):
    """Return request response schema."""

    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    order_id: UUID = Field(alias="orderId")
    customer_id: UUID = Field(alias="customerId")
    reason: str
    resolution_notes: str | None = Field(default=None, alias="resolutionNotes")
    status: ReturnStatus
    refund_transaction_id: UUID | None = Field(default=None, alias="refundTransactionId")
    refund_amount: Decimal | None = Field(default=None, alias="refundAmount")
    refund_currency: str | None = Field(default=None, alias="refundCurrency")
    audit: AuditSchema
    customer: ReturnCustomer | None = None
    order: ReturnOrderSummary | None = None


class ReturnListResponse(BaseModel):
    """Paged list response for return requests."""

    model_config = ConfigDict(populate_by_name=True)

    items: list[ReturnRead]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")


class ReturnDecisionRequest(BaseModel):
    """Approve or reject a return."""

    model_config = ConfigDict(populate_by_name=True)

    resolution_notes: Optional[str] = Field(default=None, alias="resolutionNotes")
    auto_refund: bool = Field(default=False, alias="autoRefund")
    refund_amount: Decimal | None = Field(default=None, alias="refundAmount")


class ReturnRefundRequest(BaseModel):
    """Explicit refund request for a return."""

    model_config = ConfigDict(populate_by_name=True)

    amount: Decimal | None = Field(default=None, description="Amount to refund. Defaults to full amount.")
    reason: str | None = Field(default=None, description="Reason for refund override.")

