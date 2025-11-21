"""Reports and analytics schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SalesSummary(BaseModel):
    """Sales summary statistics."""

    total_revenue: Decimal
    total_orders: int
    average_order_value: Decimal
    currency: str


class ProductStats(BaseModel):
    """Product statistics."""

    total_products: int
    low_inventory_count: int
    out_of_stock_count: int


class OrderStats(BaseModel):
    """Order statistics."""

    total_orders: int
    pending_orders: int
    confirmed_orders: int
    cancelled_orders: int


class RevenueByPeriod(BaseModel):
    """Revenue breakdown by time period."""

    period: str  # e.g., "2024-01", "2024-01-15"
    revenue: Decimal
    order_count: int
    currency: str


class TopProduct(BaseModel):
    """Top selling product."""

    product_id: UUID
    product_name: str
    sku: str
    total_quantity_sold: int
    total_revenue: Decimal
    currency: str


class DashboardResponse(BaseModel):
    """Complete dashboard data."""

    sales_summary: SalesSummary
    product_stats: ProductStats
    order_stats: OrderStats
    revenue_by_period: list[RevenueByPeriod]
    top_products: list[TopProduct]
    period_start: datetime
    period_end: datetime

