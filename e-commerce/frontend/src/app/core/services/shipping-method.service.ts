import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { ShippingMethod, ShippingMethodListResponse } from '../../shared/models/shipping-method';

@Injectable({
  providedIn: 'root',
})
export class ShippingMethodService {
  private readonly baseUrl = `${environment.apiBaseUrl}/shipping-methods`;

  constructor(private readonly http: HttpClient) {}

  listShippingMethods(isActive?: boolean): Observable<ShippingMethodListResponse> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) {
      params['is_active'] = isActive.toString();
    }
    return this.http.get<ShippingMethodListResponse>(this.baseUrl, { params });
  }

  getShippingMethod(shippingMethodId: string): Observable<ShippingMethod> {
    return this.http.get<ShippingMethod>(`${this.baseUrl}/${shippingMethodId}`);
  }

  createShippingMethod(payload: {
    name: string;
    description?: string;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
    baseCost: {
      currency: string;
      amount: number;
    };
    costPerKg?: {
      currency: string;
      amount: number;
    };
    isActive: boolean;
    requiresSignature: boolean;
    isExpress: boolean;
  }): Observable<ShippingMethod> {
    return this.http.post<ShippingMethod>(this.baseUrl, payload);
  }

  updateShippingMethod(shippingMethodId: string, payload: {
    name?: string;
    description?: string;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
    baseCost?: {
      currency: string;
      amount: number;
    };
    costPerKg?: {
      currency: string;
      amount: number;
    };
    isActive?: boolean;
    requiresSignature?: boolean;
    isExpress?: boolean;
  }): Observable<ShippingMethod> {
    return this.http.put<ShippingMethod>(`${this.baseUrl}/${shippingMethodId}`, payload);
  }
}
