"""Notification endpoints for testing and management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import RequireTenantAdmin
from app.db.models.user import User
from app.db.session import get_session
from app.services.notifications import NotificationService

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class SendTestEmailRequest(BaseModel):
    """Request to send test email."""

    to_email: EmailStr
    subject: str
    body: str


@router.post("/test/email")
async def send_test_email(
    payload: SendTestEmailRequest,
    current_user: User = RequireTenantAdmin,
    session: AsyncSession = Depends(get_session),
):
    """Send a test email (admin only)."""
    from app.tasks.notifications import send_email_task

    result = send_email_task.delay(
        to_email=payload.to_email,
        subject=payload.subject,
        body=payload.body,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
    )

    return {
        "task_id": result.id,
        "status": "queued",
        "message": "Email task queued successfully",
    }


@router.get("/tasks/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = RequireTenantAdmin,
):
    """Get status of a Celery task."""
    from app.celery_app import celery_app

    task = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.ready() else None,
    }

