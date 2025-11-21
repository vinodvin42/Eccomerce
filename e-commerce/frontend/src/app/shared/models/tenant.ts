import type { AuditMetadata } from './catalog';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'Active' | 'Suspended';
  primaryContact: string;
  audit: AuditMetadata;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  primaryContact: string;
}

