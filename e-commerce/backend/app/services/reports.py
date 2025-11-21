"""Reports and analytics service."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.order import Order, OrderItem, OrderStatus
from app.db.models.product import Product


class ReportsService:
    """Service for generating reports and analytics."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _normalize_date_range(
        start_date: datetime | None, end_date: datetime | None, default_days: int = 30
    ) -> tuple[datetime, datetime]:
        """Normalize date range to ensure proper inclusive filtering."""
        if not end_date:
            end_date = datetime.utcnow()
        else:
            # Ensure end_date includes the full day (set to end of day)
            # If end_date is at midnight (00:00:00), it means it was parsed from a date string
            # and we should include the entire day
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        if not start_date:
            start_date = end_date - timedelta(days=default_days)
        else:
            # Ensure start_date is at the beginning of the day
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

        return start_date, end_date

    async def get_sales_summary(
        self, tenant_id: UUID, start_date: datetime | None = None, end_date: datetime | None = None
    ) -> dict:
        """Get sales summary statistics."""
        start_date, end_date = self._normalize_date_range(start_date, end_date, default_days=30)

        # Query to get aggregated stats across all currencies
        # We need to handle multiple currencies by summing them separately
        base_query = (
            select(
                func.sum(Order.total_amount).label("total_revenue"),
                func.count(Order.id).label("total_orders"),
                func.avg(Order.total_amount).label("avg_order_value"),
            )
            .where(
                Order.tenant_id == tenant_id,
                Order.created_date >= start_date,
                Order.created_date <= end_date,
                Order.status != OrderStatus.cancelled,
            )
        )

        result = await self.session.execute(base_query)
        row = result.first()

        # Get the primary currency (most common currency in the date range)
        currency_query = (
            select(Order.total_currency, func.count(Order.id).label("order_count"))
            .where(
                Order.tenant_id == tenant_id,
                Order.created_date >= start_date,
                Order.created_date <= end_date,
                Order.status != OrderStatus.cancelled,
            )
            .group_by(Order.total_currency)
            .order_by(func.count(Order.id).desc())
            .limit(1)
        )
        currency_result = await self.session.execute(currency_query)
        currency_row = currency_result.first()
        primary_currency = currency_row.total_currency if currency_row else "INR"

        # Handle None values from aggregate functions
        total_revenue = row.total_revenue if row and row.total_revenue is not None else Decimal("0.00")
        total_orders = row.total_orders if row and row.total_orders is not None else 0
        avg_order_value = (
            row.avg_order_value if row and row.avg_order_value is not None else Decimal("0.00")
        )

        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "average_order_value": avg_order_value,
            "currency": primary_currency,
        }

    async def get_product_stats(self, tenant_id: UUID) -> dict:
        """Get product statistics."""
        total_query = select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
        total_result = await self.session.execute(total_query)
        total_products = total_result.scalar_one() or 0

        low_inventory_query = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id, Product.inventory < 10, Product.inventory > 0
        )
        low_result = await self.session.execute(low_inventory_query)
        low_inventory = low_result.scalar_one() or 0

        out_of_stock_query = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id, Product.inventory == 0
        )
        out_result = await self.session.execute(out_of_stock_query)
        out_of_stock = out_result.scalar_one() or 0

        return {
            "total_products": total_products,
            "low_inventory_count": low_inventory,
            "out_of_stock_count": out_of_stock,
        }

    async def get_order_stats(self, tenant_id: UUID) -> dict:
        """Get order statistics."""
        total_query = select(func.count(Order.id)).where(Order.tenant_id == tenant_id)
        total_result = await self.session.execute(total_query)
        total_orders = total_result.scalar_one() or 0

        pending_query = select(func.count(Order.id)).where(
            Order.tenant_id == tenant_id, Order.status == OrderStatus.pending_payment
        )
        pending_result = await self.session.execute(pending_query)
        pending_orders = pending_result.scalar_one() or 0

        confirmed_query = select(func.count(Order.id)).where(
            Order.tenant_id == tenant_id, Order.status == OrderStatus.confirmed
        )
        confirmed_result = await self.session.execute(confirmed_query)
        confirmed_orders = confirmed_result.scalar_one() or 0

        cancelled_query = select(func.count(Order.id)).where(
            Order.tenant_id == tenant_id, Order.status == OrderStatus.cancelled
        )
        cancelled_result = await self.session.execute(cancelled_query)
        cancelled_orders = cancelled_result.scalar_one() or 0

        return {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "confirmed_orders": confirmed_orders,
            "cancelled_orders": cancelled_orders,
        }

    async def get_revenue_by_period(
        self, tenant_id: UUID, start_date: datetime, end_date: datetime, period: str = "day"
    ) -> Sequence[dict]:
        """Get revenue breakdown by time period."""
        start_date, end_date = self._normalize_date_range(start_date, end_date, default_days=30)
        if period == "day":
            date_trunc = func.date_trunc("day", Order.created_date)
            date_format = func.to_char(Order.created_date, "YYYY-MM-DD")
        elif period == "week":
            date_trunc = func.date_trunc("week", Order.created_date)
            date_format = func.to_char(Order.created_date, "YYYY-WW")
        else:  # month
            date_trunc = func.date_trunc("month", Order.created_date)
            date_format = func.to_char(Order.created_date, "YYYY-MM")

        query = (
            select(
                date_format.label("period"),
                func.sum(Order.total_amount).label("revenue"),
                func.count(Order.id).label("order_count"),
                Order.total_currency,
            )
            .where(
                Order.tenant_id == tenant_id,
                Order.created_date >= start_date,
                Order.created_date <= end_date,
                Order.status != OrderStatus.cancelled,
            )
            .group_by(date_format, Order.total_currency)
            .order_by(date_format)
        )

        result = await self.session.execute(query)
        rows = result.all()

        return [
            {
                "period": row.period,
                "revenue": row.revenue or Decimal("0.00"),
                "order_count": row.order_count or 0,
                "currency": row.total_currency or "INR",
            }
            for row in rows
        ]

    async def get_top_products(
        self, tenant_id: UUID, limit: int = 10, start_date: datetime | None = None, end_date: datetime | None = None
    ) -> Sequence[dict]:
        """Get top selling products."""
        start_date, end_date = self._normalize_date_range(start_date, end_date, default_days=30)

        query = (
            select(
                OrderItem.product_id,
                Product.name.label("product_name"),
                Product.sku,
                func.sum(OrderItem.quantity).label("total_quantity"),
                func.sum(OrderItem.unit_price_amount * OrderItem.quantity).label("total_revenue"),
                OrderItem.unit_price_currency,
            )
            .join(Order, OrderItem.order_id == Order.id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(
                Order.tenant_id == tenant_id,
                Order.status != OrderStatus.cancelled,
                Order.created_date >= start_date,
                Order.created_date <= end_date,
            )
            .group_by(
                OrderItem.product_id,
                Product.name,
                Product.sku,
                OrderItem.unit_price_currency,
            )
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        rows = result.all()

        return [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "sku": row.sku,
                "total_quantity_sold": int(row.total_quantity or 0),
                "total_revenue": row.total_revenue or Decimal("0.00"),
                "currency": row.unit_price_currency or "INR",
            }
            for row in rows
        ]

    async def get_dashboard_data(
        self,
        tenant_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        period: str = "day",
    ) -> dict:
        """Get complete dashboard data."""
        start_date, end_date = self._normalize_date_range(start_date, end_date, default_days=30)

        sales_summary = await self.get_sales_summary(tenant_id, start_date, end_date)
        product_stats = await self.get_product_stats(tenant_id)
        order_stats = await self.get_order_stats(tenant_id)
        revenue_by_period = await self.get_revenue_by_period(tenant_id, start_date, end_date, period)
        top_products = await self.get_top_products(tenant_id, limit=10, start_date=start_date, end_date=end_date)

        return {
            "sales_summary": sales_summary,
            "product_stats": product_stats,
            "order_stats": order_stats,
            "revenue_by_period": list(revenue_by_period),
            "top_products": list(top_products),
            "period_start": start_date,
            "period_end": end_date,
        }

