export interface SalesSummary {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  currency: string;
}

export interface ProductStats {
  total_products: number;
  low_inventory_count: number;
  out_of_stock_count: number;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  cancelled_orders: number;
}

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  order_count: number;
  currency: string;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  sku: string;
  total_quantity_sold: number;
  total_revenue: number;
  currency: string;
}

export interface DashboardResponse {
  sales_summary: SalesSummary;
  product_stats: ProductStats;
  order_stats: OrderStats;
  revenue_by_period: RevenueByPeriod[];
  top_products: TopProduct[];
  period_start: string;
  period_end: string;
}

