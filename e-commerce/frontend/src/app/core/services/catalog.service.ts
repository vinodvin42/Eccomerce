import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Product, ProductCreateRequest, ProductListResponse } from '../../shared/models/catalog';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly baseUrl = `${environment.apiBaseUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  listProducts(page = 1, pageSize = 20, search?: string): Observable<ProductListResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (search) {
      params['search'] = search;
    }
    return this.http.get<ProductListResponse>(this.baseUrl, { params });
  }

  createProduct(payload: ProductCreateRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, payload);
  }

  getProduct(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${productId}`);
  }

  updateProduct(productId: string, payload: Partial<ProductCreateRequest>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${productId}`, payload);
  }
}

