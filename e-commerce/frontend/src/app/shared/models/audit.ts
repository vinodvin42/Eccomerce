export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  tenant_id: string;
  action: AuditAction;
  actor_id: string;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_date: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

