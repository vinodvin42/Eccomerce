import type { AuditMetadata } from './catalog';

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  slug: string;
  parentId?: string;
  isActive: boolean;
  audit: AuditMetadata;
}

export interface CategoryListResponse {
  items: Category[];
  total: number;
  page: number;
  pageSize: number;
}

