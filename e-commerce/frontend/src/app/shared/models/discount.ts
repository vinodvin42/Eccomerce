export type DiscountType = 'Percentage' | 'FixedAmount' | 'FreeShipping';
export type DiscountScope = 'Product' | 'Category' | 'Order' | 'Cart';
export type DiscountStatus = 'Active' | 'Inactive' | 'Expired';

export interface Discount {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue?: number;
  discountCurrency?: string;
  scope: DiscountScope;
  productId?: string; // Deprecated, use productIds
  productIds?: string[]; // Multiple product IDs
  categoryId?: string;
  validFrom: string;
  validUntil?: string;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  currentUses: number;
  minimumOrderAmount?: number;
  minimumOrderCurrency?: string;
  isActive: boolean;
  status: DiscountStatus;
  audit?: {
    createdBy: string;
    createdDate: string;
    modifiedBy: string;
    modifiedDate: string;
  };
}

export interface CreateDiscountRequest {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue?: number;
  discountCurrency?: string;
  scope: DiscountScope;
  productId?: string; // Deprecated, use productIds
  productIds?: string[]; // Multiple product IDs
  categoryId?: string;
  validFrom: string;
  validUntil?: string;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  minimumOrderAmount?: number;
  minimumOrderCurrency?: string;
  isActive: boolean;
}

export interface UpdateDiscountRequest {
  name?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  discountCurrency?: string;
  scope?: DiscountScope;
  productId?: string; // Deprecated, use productIds
  productIds?: string[]; // Multiple product IDs
  categoryId?: string;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  minimumOrderAmount?: number;
  minimumOrderCurrency?: string;
  isActive?: boolean;
}

export interface DiscountListResponse {
  items: Discount[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApplyDiscountRequest {
  code: string;
  orderAmount: number;
  orderCurrency: string;
  customerId?: string;
}

export interface ApplyDiscountResponse {
  discount: Discount;
  discountAmount: number;
  discountCurrency: string;
  finalAmount: number;
}

