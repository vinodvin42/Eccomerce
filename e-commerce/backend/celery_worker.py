"""Entry point for Celery worker."""

from __future__ import annotations

from app.celery_app import celery_app

if __name__ == "__main__":
    celery_app.start()

