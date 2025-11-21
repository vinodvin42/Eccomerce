import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  DashboardResponse,
  OrderStats,
  ProductStats,
  SalesSummary,
  TopProduct,
} from '../../shared/models/reports';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/reports`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(
    startDate?: string,
    endDate?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Observable<DashboardResponse> {
    let params = new HttpParams().set('period', period);
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get<DashboardResponse>(`${this.baseUrl}/dashboard`, { params });
  }

  getSalesSummary(startDate?: string, endDate?: string): Observable<SalesSummary> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get<SalesSummary>(`${this.baseUrl}/sales-summary`, { params });
  }

  getProductStats(): Observable<ProductStats> {
    return this.http.get<ProductStats>(`${this.baseUrl}/product-stats`);
  }

  getOrderStats(): Observable<OrderStats> {
    return this.http.get<OrderStats>(`${this.baseUrl}/order-stats`);
  }

  getTopProducts(limit = 10, startDate?: string, endDate?: string): Observable<TopProduct[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get<TopProduct[]>(`${this.baseUrl}/top-products`, { params });
  }
}

