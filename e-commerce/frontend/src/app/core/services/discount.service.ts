import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { environment } from '../../../environments/environment';
import type {
  ApplyDiscountRequest,
  ApplyDiscountResponse,
  CreateDiscountRequest,
  Discount,
  DiscountListResponse,
  UpdateDiscountRequest,
} from '../../shared/models/discount';

@Injectable({
  providedIn: 'root',
})
export class DiscountService {
  private readonly baseUrl = `${environment.apiBaseUrl}/discounts`;
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

  enrichHeaders(headers: HttpHeaders): HttpHeaders {
    return headers
      .set('X-Tenant-ID', this.tenantId)
      .set('X-Actor-ID', this.actorId)
      .set('X-Correlation-ID', uuid());
  }

  listDiscounts(
    page: number = 1,
    pageSize: number = 20,
    isActive?: boolean,
    status?: string
  ): Observable<DiscountListResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (isActive !== undefined) {
      params['is_active'] = isActive.toString();
    }
    if (status) {
      params['status'] = status;
    }
    return this.http.get<DiscountListResponse>(this.baseUrl, { params });
  }

  getDiscount(discountId: string): Observable<Discount> {
    return this.http.get<Discount>(`${this.baseUrl}/${discountId}`);
  }

  createDiscount(payload: CreateDiscountRequest): Observable<Discount> {
    return this.http.post<Discount>(this.baseUrl, payload);
  }

  updateDiscount(discountId: string, payload: UpdateDiscountRequest): Observable<Discount> {
    return this.http.put<Discount>(`${this.baseUrl}/${discountId}`, payload);
  }

  deleteDiscount(discountId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${discountId}`);
  }

  applyDiscount(payload: ApplyDiscountRequest): Observable<ApplyDiscountResponse> {
    return this.http.post<ApplyDiscountResponse>(`${this.baseUrl}/apply`, payload);
  }
}

