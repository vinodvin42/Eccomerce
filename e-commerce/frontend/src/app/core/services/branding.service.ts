import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, map, catchError } from 'rxjs';

import type { Tenant } from '../../shared/models/tenant';
import { TenantService } from './tenant.service';

@Injectable({
  providedIn: 'root',
})
export class BrandingService {
  private readonly tenantBrandKey = 'tenant_brand_name';
  private readonly defaultTenantBrand = 'Premium Jewelry';
  private readonly platformBrand = 'Premium';
  private readonly tenantBrandSubject = new BehaviorSubject<string>(this.readTenantBrand());

  constructor(private readonly tenantService: TenantService) {}

  getTenantFacingBrand(): string {
    return this.tenantBrandSubject.getValue();
  }

  get tenantBrandChanges$(): Observable<string> {
    return this.tenantBrandSubject.asObservable();
  }

  clearTenantBrand(): void {
    localStorage.removeItem(this.tenantBrandKey);
    this.tenantBrandSubject.next(this.defaultTenantBrand);
  }

  getAdminBrand(role: string | null | undefined): string {
    if (role && role.toLowerCase() === 'super_admin') {
      return this.platformBrand;
    }
    return this.getTenantFacingBrand();
  }

  syncTenantBrand(tenantId: string | null | undefined): Observable<string | null> {
    if (!tenantId) {
      this.clearTenantBrand();
      return of(null);
    }

    this.tenantService.setTenant(tenantId);

    return this.tenantService.getTenant(tenantId).pipe(
      tap((tenant: Tenant) => {
        localStorage.setItem(this.tenantBrandKey, tenant.name);
        this.tenantBrandSubject.next(tenant.name);
      }),
      map((tenant) => tenant.name),
      catchError(() => {
        localStorage.setItem(this.tenantBrandKey, this.defaultTenantBrand);
        this.tenantBrandSubject.next(this.defaultTenantBrand);
        return of(this.defaultTenantBrand);
      })
    );
  }

  private readTenantBrand(): string {
    return localStorage.getItem(this.tenantBrandKey) ?? this.defaultTenantBrand;
  }
}


