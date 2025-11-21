import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { environment } from '../../../environments/environment';
import type { CreateTenantRequest, Tenant } from '../../shared/models/tenant';

export interface TenantListResponse {
  items: Tenant[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private readonly baseUrl = `${environment.apiBaseUrl}/tenants`;
  private tenantId = '910dccc7-bc18-4d75-8329-bdc766c1097c';
  private actorId = '00000000-0000-0000-0000-000000000002';

  constructor(private readonly http: HttpClient) {}

  setTenant(tenantId: string | null | undefined): void {
    if (tenantId) {
      this.tenantId = tenantId;
    }
  }

  setActor(actorId: string): void {
    this.actorId = actorId;
  }

  getCurrentTenant(): string {
    return this.tenantId;
  }

  enrichHeaders(headers: HttpHeaders): HttpHeaders {
    return headers
      .set('X-Tenant-ID', this.tenantId)
      .set('X-Actor-ID', this.actorId)
      .set('X-Correlation-ID', uuid());
  }

  listTenants(): Observable<TenantListResponse> {
    return this.http.get<TenantListResponse>(this.baseUrl);
  }

  createTenant(payload: CreateTenantRequest): Observable<Tenant> {
    return this.http.post<Tenant>(this.baseUrl, payload);
  }

  getTenant(tenantId: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.baseUrl}/${tenantId}`);
  }

  onboardTenant(payload: {
    tenantName: string;
    tenantSlug: string;
    primaryContact: string;
    adminEmail: string;
    adminUsername: string;
    adminPassword: string;
    adminFullName: string;
    setupDefaultCatalog: boolean;
    setupDefaultPaymentMethods: boolean;
    setupDefaultShippingMethods: boolean;
  }): Observable<{
    tenant: Tenant;
    adminUserId: string;
    adminEmail: string;
    message: string;
  }> {
    return this.http.post<{
      tenant: Tenant;
      adminUserId: string;
      adminEmail: string;
      message: string;
    }>(`${this.baseUrl}/onboard`, payload);
  }
}

