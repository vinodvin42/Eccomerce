import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, switchMap, tap, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { TokenResponse, UserResponse } from '../../shared/models/auth';
import { BrandingService } from './branding.service';
import { TenantService } from './tenant.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly tokenKey = 'access_token';
  private readonly userKey = 'current_user';

  constructor(
    private readonly http: HttpClient,
    private readonly brandingService: BrandingService,
    private readonly tenantService: TenantService
  ) {
    const cachedUser = this.getStoredUser();
    if (cachedUser) {
      this.tenantService.setTenant(cachedUser.tenant_id);
      this.brandingService.syncTenantBrand(cachedUser.tenant_id).subscribe();
    }
  }

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, { username, password });
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/me`).pipe(
      tap((user) => {
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.tenantService.setTenant(user.tenant_id);
      }),
      switchMap((user) =>
        this.brandingService.syncTenantBrand(user.tenant_id).pipe(map(() => user))
      )
    );
  }

  getStoredUser(): UserResponse | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  logout(): void {
    this.removeToken();
    this.brandingService.clearTenantBrand();
    this.tenantService.setTenant(null);
  }

  register(payload: { email: string; username: string; password: string; fullName: string }): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/register`, {
      email: payload.email,
      username: payload.username,
      password: payload.password,
      full_name: payload.fullName,
    });
  }
}

