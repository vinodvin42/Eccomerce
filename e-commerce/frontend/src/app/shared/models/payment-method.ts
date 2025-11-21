import type { AuditMetadata } from './catalog';

export type PaymentMethodType =
  | 'CreditCard'
  | 'DebitCard'
  | 'PayPal'
  | 'BankTransfer'
  | 'CashOnDelivery'
  | 'DigitalWallet'
  | 'Other';

export interface PaymentMethod {
  id: string;
  tenantId: string;
  name: string;
  type: PaymentMethodType;
  description?: string;
  isActive: boolean;
  requiresProcessing: boolean;
  processingFeePercentage?: number;
  processingFeeFixed?: number;
  audit: AuditMetadata;
}

export interface PaymentMethodListResponse {
  items: PaymentMethod[];
  total: number;
  page: number;
  pageSize: number;
}

