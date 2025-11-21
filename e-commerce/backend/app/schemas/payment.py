"""Payment transaction schemas."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.payment_transaction import PaymentProvider, PaymentStatus
from app.schemas.shared import AuditSchema


class PaymentTransactionRead(BaseModel):
    """Schema for reading a payment transaction."""

    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    order_id: UUID = Field(alias="orderId")
    payment_method_id: UUID = Field(alias="paymentMethodId")
    provider: PaymentProvider
    provider_transaction_id: str | None = Field(None, alias="providerTransactionId")
    provider_payment_intent_id: str | None = Field(None, alias="providerPaymentIntentId")
    amount_currency: str = Field(alias="amountCurrency")
    amount: Decimal
    fee_amount: Decimal | None = Field(None, alias="feeAmount")
    net_amount: Decimal | None = Field(None, alias="netAmount")
    status: PaymentStatus
    metadata: dict | None = None
    failure_reason: str | None = Field(None, alias="failureReason")
    last4: str | None = None
    card_brand: str | None = Field(None, alias="cardBrand")
    refund_amount: Decimal | None = Field(None, alias="refundAmount")
    refund_reason: str | None = Field(None, alias="refundReason")
    client_secret: str | None = Field(None, alias="clientSecret")
    audit: AuditSchema


class CreatePaymentIntentRequest(BaseModel):
    """Request to create a payment intent."""

    model_config = ConfigDict(populate_by_name=True)

    order_id: UUID = Field(alias="orderId")


class ConfirmPaymentRequest(BaseModel):
    """Request to confirm a payment."""

    model_config = ConfigDict(populate_by_name=True)

    transaction_id: UUID = Field(alias="transactionId")
    payment_method_id: str | None = Field(None, alias="paymentMethodId")  # For Stripe payment method ID


class ConfirmPaymentResponse(BaseModel):
    """Response after confirming payment."""

    model_config = ConfigDict(populate_by_name=True)

    transaction: PaymentTransactionRead
    order_status: str = Field(alias="orderStatus")
    success: bool

