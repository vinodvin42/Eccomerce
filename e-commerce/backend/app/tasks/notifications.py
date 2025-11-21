"""Notification tasks for Celery."""

from __future__ import annotations

import structlog
from celery import Task

from app.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(bind=True, name="notifications.send_email")
def send_email_task(
    self: Task,
    to_email: str,
    subject: str,
    body: str,
    tenant_id: str | None = None,
) -> dict[str, str]:
    """Send email notification via Celery task."""
    logger.info(
        "sending_email",
        to_email=to_email,
        subject=subject,
        tenant_id=tenant_id,
    )

    # TODO: Integrate with email service (SendGrid, SES, etc.)
    # For now, just log the email
    print(f"[EMAIL] To: {to_email}, Subject: {subject}")
    print(f"[EMAIL] Body: {body}")

    return {"status": "sent", "to": to_email, "subject": subject}


@celery_app.task(bind=True, name="notifications.send_sms")
def send_sms_task(
    self: Task,
    to_phone: str,
    message: str,
    tenant_id: str | None = None,
) -> dict[str, str]:
    """Send SMS notification via Celery task."""
    logger.info(
        "sending_sms",
        to_phone=to_phone,
        tenant_id=tenant_id,
    )

    # TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    # For now, just log the SMS
    print(f"[SMS] To: {to_phone}, Message: {message}")

    return {"status": "sent", "to": to_phone}


@celery_app.task(bind=True, name="notifications.send_order_confirmation")
def send_order_confirmation_task(
    self: Task,
    order_id: str,
    customer_email: str,
    order_total: float,
    currency: str,
    tenant_id: str,
) -> dict[str, str]:
    """Send order confirmation email."""
    subject = f"Order Confirmation - Order #{order_id[:8]}"
    body = f"""
    Thank you for your order!
    
    Order ID: {order_id}
    Total: {currency} {order_total:.2f}
    
    Your order has been confirmed and will be processed shortly.
    """

    # Chain the email task
    result = send_email_task.delay(
        to_email=customer_email,
        subject=subject,
        body=body,
        tenant_id=tenant_id,
    )
    return {"status": "queued", "email_task_id": result.id}


@celery_app.task(bind=True, name="notifications.send_welcome_email")
def send_welcome_email_task(
    self: Task,
    user_email: str,
    user_name: str,
    tenant_id: str | None = None,
) -> dict[str, str]:
    """Send welcome email to new user."""
    subject = "Welcome to Premium Commerce!"
    body = f"""
    Hello {user_name},
    
        Welcome to Premium Commerce! We're excited to have you on board.
    
    Get started by browsing our store and finding products you love.
    
    Happy shopping!
    """

    # Chain the email task
    result = send_email_task.delay(
        to_email=user_email,
        subject=subject,
        body=body,
        tenant_id=tenant_id,
    )
    return {"status": "queued", "email_task_id": result.id}

