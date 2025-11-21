"""Returns automation tasks for Celery."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

import structlog
from celery import Task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.core.config import get_settings
from app.core.events import publish_return_completed, publish_return_sla_breach
from app.db.models.audit_log import AuditAction, AuditLog
from app.db.models.order import Order
from app.db.models.return_request import ReturnRequest, ReturnStatus
from app.db.session import get_session
from app.services.audit import AuditService
from app.services.payments import PaymentService
from app.services.returns import ReturnService

settings = get_settings()
logger = structlog.get_logger(__name__)


def get_db_session() -> AsyncSession:
    """Get database session for Celery tasks."""
    from app.db.session import async_session

    return async_session()


@celery_app.task(bind=True, name="returns.auto_approval", queue="returns.auto")
def return_auto_approval_task(self: Task) -> dict[str, int]:
    """
    Auto-approve return requests based on configurable rules.

    Rules evaluated:
    - Order value < threshold (default: $300)
    - Time since order creation < threshold (default: 14 days)
    - Customer has no previous rejected returns
    """
    import asyncio

    async def _process() -> dict[str, int]:
        session = get_db_session()
        try:
            # Get pending returns created in last 24 hours
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            result = await session.execute(
                select(ReturnRequest)
                .where(
                    ReturnRequest.status == ReturnStatus.pending,
                    ReturnRequest.created_date >= cutoff,
                )
                .options(selectinload(ReturnRequest.order))
            )
            pending_returns = result.scalars().all()

            approved_count = 0
            skipped_count = 0

            for return_request in pending_returns:
                try:
                    # Evaluate auto-approval rules
                    should_approve = await _evaluate_auto_approval_rules(session, return_request)

                    if should_approve:
                        # Auto-approve the return
                        return_service = ReturnService(session)
                        await return_service.approve_return(
                            tenant_id=return_request.tenant_id,
                            return_id=return_request.id,
                            actor_id=return_request.created_by,  # System actor
                            resolution_notes="Auto-approved based on automation rules",
                        )

                        # Log audit entry
                        audit_service = AuditService(session)
                        await audit_service.log_action(
                            tenant_id=return_request.tenant_id,
                            actor_id=return_request.created_by,
                            action=AuditAction.RETURN_AUTO_APPROVED,
                            entity_type="ReturnRequest",
                            entity_id=return_request.id,
                            details={
                                "return_id": str(return_request.id),
                                "order_id": str(return_request.order_id),
                                "reason": "Automated approval based on rules",
                            },
                        )

                        logger.info(
                            "return_auto_approved",
                            return_id=str(return_request.id),
                            order_id=str(return_request.order_id),
                            tenant_id=str(return_request.tenant_id),
                        )
                        approved_count += 1
                    else:
                        skipped_count += 1

                except Exception as e:
                    logger.error(
                        "return_auto_approval_failed",
                        return_id=str(return_request.id),
                        error=str(e),
                    )

            await session.commit()
            return {"approved": approved_count, "skipped": skipped_count}
        except Exception as e:
            await session.rollback()
            logger.error("return_auto_approval_error", error=str(e))
            raise
        finally:
            await session.close()

    return asyncio.run(_process())


async def _evaluate_auto_approval_rules(session: AsyncSession, return_request: ReturnRequest) -> bool:
    """Evaluate if a return request should be auto-approved."""
    # Rule 1: Order value threshold (default: $300)
    max_amount = Decimal("300.00")
    if return_request.order.total_amount > max_amount:
        logger.debug(
            "auto_approval_rule_failed",
            return_id=str(return_request.id),
            rule="max_amount",
            order_amount=float(return_request.order.total_amount),
            threshold=float(max_amount),
        )
        return False

    # Rule 2: Time since order creation (default: 14 days)
    days_threshold = 14
    order_age = datetime.now(timezone.utc) - return_request.order.created_date
    if order_age.days > days_threshold:
        logger.debug(
            "auto_approval_rule_failed",
            return_id=str(return_request.id),
            rule="order_age",
            age_days=order_age.days,
            threshold=days_threshold,
        )
        return False

    # Rule 3: Check for previous rejected returns (basic check)
    # In production, you'd check customer history more thoroughly
    previous_rejected = await session.execute(
        select(ReturnRequest).where(
            ReturnRequest.customer_id == return_request.customer_id,
            ReturnRequest.status == ReturnStatus.rejected,
            ReturnRequest.tenant_id == return_request.tenant_id,
        )
    )
    if previous_rejected.scalar_one_or_none():
        logger.debug(
            "auto_approval_rule_failed",
            return_id=str(return_request.id),
            rule="previous_rejected",
        )
        return False

    # All rules passed
    return True


@celery_app.task(bind=True, name="returns.sla_reminder", queue="returns.sla")
def return_sla_reminder_task(self: Task) -> dict[str, int]:
    """
    Check for return requests nearing or breaching SLA thresholds.

    Default SLAs:
    - Acknowledgement: 24 hours (pending returns)
    - Resolution: 72 hours (approved returns awaiting refund)
    """
    import asyncio

    async def _process() -> dict[str, int]:
        session = get_db_session()
        try:
            now = datetime.now(timezone.utc)
            ack_sla_hours = 24
            resolution_sla_hours = 72

            reminders_sent = 0
            breaches_detected = 0

            # Check pending returns for acknowledgement SLA
            ack_cutoff = now - timedelta(hours=ack_sla_hours)
            pending_result = await session.execute(
                select(ReturnRequest).where(
                    ReturnRequest.status == ReturnStatus.pending,
                    ReturnRequest.created_date <= ack_cutoff,
                )
            )
            pending_returns = pending_result.scalars().all()

            for return_request in pending_returns:
                elapsed_hours = (now - return_request.created_date).total_seconds() / 3600
                if elapsed_hours > ack_sla_hours:
                    # SLA breached
                    await _send_sla_breach_notification(session, return_request, "acknowledgement", elapsed_hours)
                    breaches_detected += 1
                elif elapsed_hours > ack_sla_hours * 0.8:  # 80% of SLA - warning
                    await _send_sla_reminder(session, return_request, "acknowledgement", elapsed_hours)
                    reminders_sent += 1

            # Check approved returns for resolution SLA
            resolution_cutoff = now - timedelta(hours=resolution_sla_hours)
            approved_result = await session.execute(
                select(ReturnRequest).where(
                    ReturnRequest.status == ReturnStatus.approved,
                    ReturnRequest.created_date <= resolution_cutoff,
                )
            )
            approved_returns = approved_result.scalars().all()

            for return_request in approved_returns:
                elapsed_hours = (now - return_request.created_date).total_seconds() / 3600
                if elapsed_hours > resolution_sla_hours:
                    # SLA breached
                    await _send_sla_breach_notification(session, return_request, "resolution", elapsed_hours)
                    breaches_detected += 1
                elif elapsed_hours > resolution_sla_hours * 0.8:  # 80% of SLA - warning
                    await _send_sla_reminder(session, return_request, "resolution", elapsed_hours)
                    reminders_sent += 1

            await session.commit()
            return {"reminders_sent": reminders_sent, "breaches_detected": breaches_detected}
        except Exception as e:
            await session.rollback()
            logger.error("return_sla_reminder_error", error=str(e))
            raise
        finally:
            await session.close()

    return asyncio.run(_process())


async def _send_sla_reminder(
    session: AsyncSession, return_request: ReturnRequest, sla_type: str, elapsed_hours: float
) -> None:
    """Send SLA reminder notification."""
    from app.tasks.notifications import send_email_task

    # Get tenant admin email (simplified - in production, query User table)
    subject = f"Return SLA Reminder - Return #{return_request.id[:8]}"
    body = f"""
    Return Request #{return_request.id[:8]} is approaching {sla_type} SLA threshold.
    
    Elapsed time: {elapsed_hours:.1f} hours
    Order ID: {return_request.order_id}
    Customer ID: {return_request.customer_id}
    
    Please review and take action.
    """

    # In production, send to tenant admin or support team
    logger.warning(
        "return_sla_reminder",
        return_id=str(return_request.id),
        sla_type=sla_type,
        elapsed_hours=elapsed_hours,
        tenant_id=str(return_request.tenant_id),
    )

    # Update resolution notes
    if return_request.resolution_notes:
        return_request.resolution_notes += f"\n[SLA Reminder] {sla_type} SLA reminder sent at {datetime.now(timezone.utc).isoformat()}"
    else:
        return_request.resolution_notes = f"[SLA Reminder] {sla_type} SLA reminder sent at {datetime.now(timezone.utc).isoformat()}"


async def _send_sla_breach_notification(
    session: AsyncSession, return_request: ReturnRequest, sla_type: str, elapsed_hours: float
) -> None:
    """Send SLA breach notification and publish event."""
    logger.error(
        "return_sla_breach",
        return_id=str(return_request.id),
        sla_type=sla_type,
        elapsed_hours=elapsed_hours,
        tenant_id=str(return_request.tenant_id),
    )

    # Publish SLA breach event
    publish_return_sla_breach(
        return_id=return_request.id,
        tenant_id=return_request.tenant_id,
        order_id=return_request.order_id,
        sla_type=sla_type,
        elapsed_hours=elapsed_hours,
    )

    # Update resolution notes
    breach_note = f"[SLA BREACH] {sla_type} SLA breached at {datetime.now(timezone.utc).isoformat()} ({elapsed_hours:.1f} hours elapsed)"
    if return_request.resolution_notes:
        return_request.resolution_notes += f"\n{breach_note}"
    else:
        return_request.resolution_notes = breach_note


@celery_app.task(bind=True, name="returns.refund_verification", queue="returns.refund")
def return_refund_verification_task(self: Task, return_id: str) -> dict[str, str]:
    """
    Verify refund status for a return request.

    This task is triggered by return.completed events or can be run periodically.
    """
    import asyncio

    async def _process() -> dict[str, str]:
        session = get_db_session()
        try:
            return_uuid = UUID(return_id)
            result = await session.execute(
                select(ReturnRequest).where(ReturnRequest.id == return_uuid).options(
                    selectinload(ReturnRequest.refund_transaction)
                )
            )
            return_request = result.scalar_one_or_none()

            if not return_request:
                return {"status": "error", "message": "Return request not found"}

            if not return_request.refund_transaction_id:
                return {"status": "skipped", "message": "No refund transaction associated"}

            # Verify refund status with payment service
            payment_service = PaymentService(session)
            transaction = await payment_service.get_payment_status(
                tenant_id=return_request.tenant_id, transaction_id=return_request.refund_transaction_id
            )

            if transaction.status.value in ("Refunded", "PartiallyRefunded"):
                # Refund successful
                if return_request.status != ReturnStatus.refunded:
                    return_request.status = ReturnStatus.refunded
                    return_request.refund_amount = transaction.refund_amount
                    return_request.refund_currency = transaction.amount_currency
                    await session.commit()

                    logger.info(
                        "return_refund_verified",
                        return_id=return_id,
                        transaction_id=str(transaction.id),
                        status=transaction.status.value,
                    )

                return {"status": "verified", "refund_status": transaction.status.value}
            else:
                # Refund may still be processing or failed
                logger.warning(
                    "return_refund_pending",
                    return_id=return_id,
                    transaction_id=str(transaction.id),
                    status=transaction.status.value,
                )
                return {"status": "pending", "refund_status": transaction.status.value}
        except Exception as e:
            await session.rollback()
            logger.error("return_refund_verification_error", return_id=return_id, error=str(e))
            return {"status": "error", "message": str(e)}
        finally:
            await session.close()

    return asyncio.run(_process())


@celery_app.task(bind=True, name="returns.periodic_refund_check", queue="returns.refund")
def return_periodic_refund_check_task(self: Task) -> dict[str, int]:
    """
    Periodically check all approved returns awaiting refund verification.
    """
    import asyncio

    async def _process() -> dict[str, int]:
        session = get_db_session()
        try:
            # Get approved returns with refund transactions
            result = await session.execute(
                select(ReturnRequest).where(
                    ReturnRequest.status == ReturnStatus.approved,
                    ReturnRequest.refund_transaction_id.isnot(None),
                )
            )
            approved_returns = result.scalars().all()

            verified_count = 0
            pending_count = 0

            for return_request in approved_returns:
                # Trigger verification task for each return
                return_refund_verification_task.delay(str(return_request.id))
                pending_count += 1

            await session.commit()
            return {"checked": len(approved_returns), "pending": pending_count}
        except Exception as e:
            await session.rollback()
            logger.error("return_periodic_refund_check_error", error=str(e))
            raise
        finally:
            await session.close()

    return asyncio.run(_process())

