import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { AuditLog, AuditLogListResponse } from '../../shared/models/audit';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly baseUrl = `${environment.apiBaseUrl}/audit`;

  constructor(private readonly http: HttpClient) {}

  listAuditLogs(
    page = 1,
    pageSize = 50,
    tenantId?: string,
    entityType?: string,
    entityId?: string,
    action?: string
  ): Observable<AuditLogListResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };
    if (tenantId) {
      params['tenant_id'] = tenantId;
    }
    if (entityType) {
      params['entity_type'] = entityType;
    }
    if (entityId) {
      params['entity_id'] = entityId;
    }
    if (action) {
      params['action'] = action;
    }
    return this.http.get<AuditLogListResponse>(this.baseUrl, { params });
  }

  getEntityAuditHistory(entityType: string, entityId: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.baseUrl}/entity/${entityType}/${entityId}`);
  }
}

