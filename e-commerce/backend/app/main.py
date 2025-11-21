"""FastAPI entrypoint."""

from __future__ import annotations

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    audit,
    auth,
    categories,
    discounts,
    notifications,
    orders,
    payment_methods,
    payments,
    products,
    reports,
    returns,
    shipping_methods,
    tenants,
    users,
)
from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Multi-tenant commerce API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # type: ignore[attr-defined]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(tenants.router)
app.include_router(users.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(reports.router)
app.include_router(payment_methods.router)
app.include_router(categories.router)
app.include_router(shipping_methods.router)
app.include_router(discounts.router)
app.include_router(payments.router)
app.include_router(returns.router)


@app.get("/health", tags=["Diagnostics"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("startup.complete", environment=settings.environment)

