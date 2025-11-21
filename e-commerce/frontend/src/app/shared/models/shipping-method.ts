import type { AuditMetadata, Money } from './catalog';

export interface ShippingMethod {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  baseCost: Money;
  costPerKg?: Money;
  isActive: boolean;
  requiresSignature: boolean;
  isExpress: boolean;
  audit: AuditMetadata;
}

export interface ShippingMethodListResponse {
  items: ShippingMethod[];
  total: number;
  page: number;
  pageSize: number;
}

