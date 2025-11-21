import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Category, CategoryListResponse } from '../../shared/models/category';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly baseUrl = `${environment.apiBaseUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  listCategories(isActive?: boolean): Observable<CategoryListResponse> {
    const params: Record<string, string> = {};
    if (isActive !== undefined) {
      params['is_active'] = isActive.toString();
    }
    return this.http.get<CategoryListResponse>(this.baseUrl, { params });
  }

  getCategory(categoryId: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/${categoryId}`);
  }

  createCategory(payload: { name: string; slug: string; description?: string; parentId?: string; isActive: boolean }): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, payload);
  }

  updateCategory(categoryId: string, payload: { name?: string; slug?: string; description?: string; parentId?: string; isActive?: boolean }): Observable<Category> {
    return this.http.put<Category>(`${this.baseUrl}/${categoryId}`, payload);
  }
}

