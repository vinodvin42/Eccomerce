import type { AuditMetadata, Money } from './catalog';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: Money;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  status: 'PendingPayment' | 'Confirmed' | 'Cancelled';
  items: OrderItem[];
  total: Money;
  audit: AuditMetadata;
  createdDate?: string;
  shippingAddress?: string;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  customerId: string;
  paymentMethodId: string;
  shippingAddress?: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

