import type { AuditMetadata, Money } from './catalog';

export type ReturnStatus = 'Pending' | 'Approved' | 'Rejected' | 'Refunded';

export interface ReturnCustomer {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface ReturnOrderItem {
  productId: string;
  productName?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface ReturnOrderSummary {
  id: string;
  status: string;
  total: Money;
  placedAt: string;
  shippingAddress?: string | null;
  itemCount: number;
  items: ReturnOrderItem[];
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  reason: string;
  resolutionNotes?: string | null;
  status: ReturnStatus;
  refundTransactionId?: string | null;
  refundAmount?: number | null;
  refundCurrency?: string | null;
  audit: AuditMetadata;
  customer?: ReturnCustomer | null;
  order?: ReturnOrderSummary | null;
}

export interface ReturnListResponse {
  items: ReturnRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateReturnRequest {
  orderId: string;
  reason: string;
}

export interface ReturnDecisionPayload {
  resolutionNotes?: string | null;
  autoRefund?: boolean;
  refundAmount?: number | null;
}

export interface ReturnRefundPayload {
  amount?: number | null;
  reason?: string | null;
}

