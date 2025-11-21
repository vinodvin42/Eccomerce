import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { CreateOrderRequest, Order } from '../../shared/models/order';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly baseUrl = `${environment.apiBaseUrl}/orders`;

  constructor(private readonly http: HttpClient) {}

  createOrder(payload: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, payload);
  }

  getOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${orderId}`);
  }

  listOrders(page = 1, pageSize = 20, customerId?: string): Observable<{ items: Order[]; total: number; page: number; pageSize: number }> {
    const params: Record<string, string> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (customerId) {
      params['customer_id'] = customerId;
    }
    return this.http.get<{ items: Order[]; total: number; page: number; pageSize: number }>(this.baseUrl, { params });
  }

  updateOrder(orderId: string, payload: { status?: string; shippingAddress?: string; shippingMethodId?: string }): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/${orderId}`, payload);
  }

  checkout(payload: {
    order: {
      customerId: string;
      paymentMethodId: string;
      shippingAddress: string;
      items: Array<{ productId: string; quantity: number; unitPrice: { amount: number; currency: string } }>;
    };
    paymentMethodId?: string;
  }): Observable<{
    order: Order;
    paymentTransaction?: { id: string; clientSecret?: string; provider: string };
    sagaStatus: string;
    requiresPaymentConfirmation: boolean;
  }> {
    return this.http.post<{
      order: Order;
      paymentTransaction?: { id: string; clientSecret?: string; provider: string };
      sagaStatus: string;
      requiresPaymentConfirmation: boolean;
    }>(`${this.baseUrl}/checkout`, payload);
  }
}

