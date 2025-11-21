import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { PaymentMethod, PaymentMethodListResponse, PaymentMethodType } from '../../shared/models/payment-method';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodService {
  private readonly baseUrl = `${environment.apiBaseUrl}/payment-methods`;

  constructor(private readonly http: HttpClient) {}

  listPaymentMethods(isActive?: boolean): Observable<PaymentMethodListResponse> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) {
      params['is_active'] = isActive.toString();
    }
    return this.http.get<PaymentMethodListResponse>(this.baseUrl, { params });
  }

  getPaymentMethod(paymentMethodId: string): Observable<PaymentMethod> {
    return this.http.get<PaymentMethod>(`${this.baseUrl}/${paymentMethodId}`);
  }

  createPaymentMethod(payload: {
    name: string;
    type: PaymentMethodType;
    description?: string;
    isActive: boolean;
    requiresProcessing: boolean;
    processingFeePercentage?: number;
    processingFeeFixed?: number;
  }): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.baseUrl, payload);
  }

  updatePaymentMethod(paymentMethodId: string, payload: {
    name?: string;
    type?: PaymentMethodType;
    description?: string;
    isActive?: boolean;
    requiresProcessing?: boolean;
    processingFeePercentage?: number;
    processingFeeFixed?: number;
  }): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.baseUrl}/${paymentMethodId}`, payload);
  }
}

