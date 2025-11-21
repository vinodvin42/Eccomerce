"""Domain event publishing utilities."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import UUID

import structlog
from kombu import Connection, Exchange, Producer

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger(__name__)

# Event exchange
events_exchange = Exchange("events", type="topic", durable=True)


def publish_event(
    event_name: str,
    event_data: dict,
    routing_key: str | None = None,
) -> None:
    """Publish domain event to RabbitMQ."""
    if not routing_key:
        routing_key = event_name.replace(".", "_")

    event_payload = {
        "event": event_name,
        "version": "1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": event_data,
    }

    try:
        with Connection(settings.celery_broker_url) as conn:
            producer = Producer(conn, exchange=events_exchange, serializer="json")
            producer.publish(
                event_payload,
                routing_key=routing_key,
                retry=True,
                declare=[events_exchange],
            )
            logger.info(
                "event_published",
                event_name=event_name,
                routing_key=routing_key,
            )
    except Exception as e:
        logger.error(
            "event_publish_failed",
            event_name=event_name,
            error=str(e),
        )
        # Don't raise - events are best-effort


def publish_order_created(
    order_id: UUID,
    tenant_id: UUID,
    customer_id: UUID,
    amount: float,
    currency: str,
) -> None:
    """Publish order.created event."""
    publish_event(
        event_name="order.created",
        event_data={
            "orderId": str(order_id),
            "tenantId": str(tenant_id),
            "customerId": str(customer_id),
            "amount": amount,
            "currency": currency,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


def publish_order_confirmed(
    order_id: UUID,
    tenant_id: UUID,
    customer_id: UUID,
    total_amount: float,
    currency: str,
) -> None:
    """Publish order.confirmed event."""
    publish_event(
        event_name="order.confirmed",
        event_data={
            "orderId": str(order_id),
            "tenantId": str(tenant_id),
            "status": "Confirmed",
            "customerId": str(customer_id),
            "totalAmount": total_amount,
            "currency": currency,
        },
    )


def publish_user_registered(
    user_id: UUID,
    email: str,
    tenant_id: UUID | None,
    role: str,
) -> None:
    """Publish user.registered event."""
    publish_event(
        event_name="user.registered",
        event_data={
            "userId": str(user_id),
            "email": email,
            "tenantId": str(tenant_id) if tenant_id else None,
            "role": role,
        },
    )


def publish_product_created(
    product_id: UUID,
    tenant_id: UUID,
    sku: str,
    name: str,
) -> None:
    """Publish product.created event."""
    publish_event(
        event_name="product.created",
        event_data={
            "productId": str(product_id),
            "tenantId": str(tenant_id),
            "sku": sku,
            "name": name,
        },
    )


def publish_order_pending_payment(
    order_id: UUID,
    tenant_id: UUID,
    amount: float,
    currency: str,
) -> None:
    """Publish order.pending_payment event."""
    publish_event(
        event_name="order.pending_payment",
        event_data={
            "orderId": str(order_id),
            "tenantId": str(tenant_id),
            "amount": amount,
            "currency": currency,
        },
    )


def publish_order_cancelled(
    order_id: UUID,
    tenant_id: UUID,
    reason: str,
) -> None:
    """Publish order.cancelled event."""
    publish_event(
        event_name="order.cancelled",
        event_data={
            "orderId": str(order_id),
            "tenantId": str(tenant_id),
            "reason": reason,
        },
    )


def publish_payment_intent_created(
    transaction_id: UUID,
    order_id: UUID,
    tenant_id: UUID,
    amount: float,
    currency: str,
    provider: str | None = None,
) -> None:
    """Publish payment.intent_created event."""
    event_data = {
        "transactionId": str(transaction_id),
        "orderId": str(order_id),
        "tenantId": str(tenant_id),
        "amount": amount,
        "currency": currency,
    }
    if provider:
        event_data["provider"] = provider
    publish_event(
        event_name="payment.intent_created",
        event_data=event_data,
    )


def publish_payment_succeeded(
    transaction_id: UUID,
    order_id: UUID,
    tenant_id: UUID,
    amount: float,
    currency: str,
    provider: str | None = None,
) -> None:
    """Publish payment.succeeded event."""
    event_data = {
        "transactionId": str(transaction_id),
        "orderId": str(order_id),
        "tenantId": str(tenant_id),
        "amount": amount,
        "currency": currency,
    }
    if provider:
        event_data["provider"] = provider
    publish_event(
        event_name="payment.succeeded",
        event_data=event_data,
    )


def publish_payment_failed(
    transaction_id: UUID,
    order_id: UUID,
    tenant_id: UUID,
    failure_reason: str,
) -> None:
    """Publish payment.failed event."""
    publish_event(
        event_name="payment.failed",
        event_data={
            "transactionId": str(transaction_id),
            "orderId": str(order_id),
            "tenantId": str(tenant_id),
            "failureReason": failure_reason,
        },
    )


def publish_inventory_reserved(
    order_id: UUID,
    tenant_id: UUID,
    items: list[dict],
) -> None:
    """Publish inventory.reserved event."""
    publish_event(
        event_name="inventory.reserved",
        event_data={
            "orderId": str(order_id),
            "tenantId": str(tenant_id),
            "items": items,
        },
    )


def publish_product_inventory_low(
    product_id: UUID,
    tenant_id: UUID,
    current_inventory: int,
    threshold: int,
) -> None:
    """Publish product.inventory_low event."""
    publish_event(
        event_name="product.inventory_low",
        event_data={
            "productId": str(product_id),
            "tenantId": str(tenant_id),
            "currentInventory": current_inventory,
            "threshold": threshold,
        },
    )


def publish_user_updated(
    user_id: UUID,
    tenant_id: UUID,
    changes: dict,
) -> None:
    """Publish user.updated event."""
    publish_event(
        event_name="user.updated",
        event_data={
            "userId": str(user_id),
            "tenantId": str(tenant_id),
            "changes": changes,
        },
    )


def publish_tenant_provisioned(
    tenant_id: UUID,
    name: str,
    slug: str,
) -> None:
    """Publish tenant.provisioned event."""
    publish_event(
        event_name="tenant.provisioned",
        event_data={
            "tenantId": str(tenant_id),
            "name": name,
            "slug": slug,
        },
    )


def publish_tenant_suspended(
    tenant_id: UUID,
    reason: str,
) -> None:
    """Publish tenant.suspended event."""
    publish_event(
        event_name="tenant.suspended",
        event_data={
            "tenantId": str(tenant_id),
            "reason": reason,
        },
    )
