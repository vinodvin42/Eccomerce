import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { CreateUserRequest, UpdateUserRequest, User, UserListResponse } from '../../shared/models/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  listUsers(page = 1, pageSize = 20, tenantId?: string, role?: string): Observable<UserListResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };
    if (tenantId) {
      params['tenant_id'] = tenantId;
    }
    if (role) {
      params['role'] = role;
    }
    return this.http.get<UserListResponse>(this.baseUrl, { params });
  }

  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${userId}`);
  }

  createUser(payload: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.baseUrl, payload);
  }

  updateUser(userId: string, payload: UpdateUserRequest): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${userId}`, payload);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}`);
  }
}

