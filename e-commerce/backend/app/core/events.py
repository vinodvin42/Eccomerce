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

