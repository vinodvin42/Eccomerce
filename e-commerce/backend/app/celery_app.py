"""Celery application configuration."""

from __future__ import annotations

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "ecommerce",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.notifications", "app.tasks.returns"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    # Celery Beat schedule for periodic tasks
    beat_schedule={
        "returns-auto-approval": {
            "task": "returns.auto_approval",
            "schedule": 15 * 60.0,  # Every 15 minutes
        },
        "returns-sla-reminder": {
            "task": "returns.sla_reminder",
            "schedule": 60 * 60.0,  # Every hour
        },
        "returns-periodic-refund-check": {
            "task": "returns.periodic_refund_check",
            "schedule": 60 * 60.0,  # Every hour
        },
    },
)

