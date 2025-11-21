"""Notification service for sending async notifications."""

from __future__ import annotations

from uuid import UUID

from app.tasks.notifications import (
    send_order_confirmation_task,
    send_welcome_email_task,
)


class NotificationService:
    """Service for triggering async notifications."""

    @staticmethod
    def send_order_confirmation(
        order_id: UUID,
        customer_email: str,
        order_total: float,
        currency: str,
        tenant_id: UUID,
    ) -> None:
        """Trigger order confirmation email."""
        send_order_confirmation_task.delay(
            order_id=str(order_id),
            customer_email=customer_email,
            order_total=order_total,
            currency=currency,
            tenant_id=str(tenant_id),
        )

    @staticmethod
    def send_welcome_email(
        user_email: str,
        user_name: str,
        tenant_id: UUID | None = None,
    ) -> None:
        """Trigger welcome email for new user."""
        send_welcome_email_task.delay(
            user_email=user_email,
            user_name=user_name,
            tenant_id=str(tenant_id) if tenant_id else None,
        )

