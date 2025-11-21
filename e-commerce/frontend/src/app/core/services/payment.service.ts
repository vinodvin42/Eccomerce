import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { environment } from '../../../environments/environment';

export interface CreatePaymentIntentRequest {
  orderId: string;
}

export interface CreatePaymentIntentResponse {
  id: string;
  orderId: string;
  paymentMethodId: string;
  provider: 'Stripe' | 'Razorpay' | 'Manual';
  providerPaymentIntentId?: string;
  amount: number;
  amountCurrency: string;
  status: 'Pending' | 'Processing' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Refunded' | 'PartiallyRefunded';
  clientSecret?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfirmPaymentRequest {
  transactionId: string;
  paymentMethodId?: string;
}

export interface ConfirmPaymentResponse {
  transaction: CreatePaymentIntentResponse;
  orderStatus: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly baseUrl = `${environment.apiBaseUrl}/payments`;
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

  createPaymentIntent(payload: CreatePaymentIntentRequest): Observable<CreatePaymentIntentResponse> {
    let headers = new HttpHeaders();
    headers = this.enrichHeaders(headers);
    return this.http.post<CreatePaymentIntentResponse>(`${this.baseUrl}/intent`, payload, { headers });
  }

  confirmPayment(payload: ConfirmPaymentRequest): Observable<ConfirmPaymentResponse> {
    let headers = new HttpHeaders();
    headers = this.enrichHeaders(headers);
    return this.http.post<ConfirmPaymentResponse>(`${this.baseUrl}/confirm`, payload, { headers });
  }

  getPaymentStatus(transactionId: string): Observable<CreatePaymentIntentResponse> {
    let headers = new HttpHeaders();
    headers = this.enrichHeaders(headers);
    return this.http.get<CreatePaymentIntentResponse>(`${this.baseUrl}/${transactionId}`, { headers });
  }
}

