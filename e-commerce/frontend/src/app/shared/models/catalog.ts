export interface Money {
  currency: string;
  amount: number;
}

export interface AuditMetadata {
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: Money;
  inventory: number;
  imageUrl?: string; // Keep for backward compatibility
  imageUrls?: string[]; // New: array of image URLs
  categoryId?: string;
  tenantId: string;
  // Jewelry-specific fields
  weight?: number;
  material?: string;
  purity?: string;
  stoneType?: string;
  size?: string;
  brand?: string;
  color?: string;
  certification?: string;
  warrantyPeriod?: string;
  origin?: string;
  // Additional jewelry-specific fields
  hsnCode?: string;
  stoneWeight?: number;
  grossWeight?: number;
  ratePerGram?: number;
  gender?: string;
  readyToDeliver?: boolean;
  // Pricing and calculation fields
  group?: string;
  wastagePercent?: number;
  metalValue?: number;
  wastageValue?: number;
  makingCharges?: number;
  stoneCharges?: number;
  gstPercent?: number;
  audit: AuditMetadata;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProductCreateRequest {
  name: string;
  sku: string;
  price: Money;
  inventory: number;
  description?: string;
  imageUrl?: string; // Keep for backward compatibility
  imageUrls?: string[]; // New: array of image URLs
  categoryId?: string;
  // Jewelry-specific fields
  weight?: number;
  material?: string;
  purity?: string;
  stoneType?: string;
  size?: string;
  brand?: string;
  color?: string;
  certification?: string;
  warrantyPeriod?: string;
  origin?: string;
  // Additional jewelry-specific fields
  hsnCode?: string;
  stoneWeight?: number;
  grossWeight?: number;
  ratePerGram?: number;
  gender?: string;
  readyToDeliver?: boolean;
  // Pricing and calculation fields
  group?: string;
  wastagePercent?: number;
  metalValue?: number;
  wastageValue?: number;
  makingCharges?: number;
  stoneCharges?: number;
  gstPercent?: number;
}

