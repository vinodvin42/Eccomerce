"""Checkout saga schemas."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.order import OrderCreate, OrderRead
from app.schemas.payment import PaymentTransactionRead


class CheckoutRequest(BaseModel):
    """Request schema for checkout with payment."""

    model_config = ConfigDict(populate_by_name=True)

    order: OrderCreate
    payment_method_id: str | None = Field(None, alias="paymentMethodId", description="Stripe payment method ID for immediate confirmation")


class CheckoutResponse(BaseModel):
    """Response schema for checkout."""

    model_config = ConfigDict(populate_by_name=True)

    order: OrderRead
    payment_transaction: PaymentTransactionRead | None = Field(None, alias="paymentTransaction")
    saga_status: str = Field(alias="sagaStatus")
    client_secret: str | None = Field(None, alias="clientSecret", description="Stripe client secret for 3D Secure")
    requires_payment_confirmation: bool = Field(alias="requiresPaymentConfirmation", description="Whether payment needs to be confirmed separately")

