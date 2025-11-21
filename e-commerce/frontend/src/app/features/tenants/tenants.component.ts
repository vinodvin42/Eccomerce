import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { finalize, map, shareReplay, startWith, switchMap, tap } from 'rxjs';

import { TenantService, type TenantListResponse } from '../../core/services/tenant.service';
import type { Tenant } from '../../shared/models/tenant';
import { TenantOnboardingWizardComponent } from './tenant-onboarding-wizard.component';

type TenantStatusFilter = 'all' | 'Active' | 'Suspended';

interface TenantViewModel {
  items: Tenant[];
  total: number;
  filteredTotal: number;
  stats: {
    active: number;
    suspended: number;
  };
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, DatePipe, ReactiveFormsModule, TenantOnboardingWizardComponent],
  template: `
    <section class="panel">
      <header class="panel__header">
        <div>
          <h2>Tenants</h2>
          <p>Multi-tenant control center with live insights.</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" type="button" (click)="refreshTenants()" [disabled]="tenantsLoading()">
            Refresh
          </button>
          <button class="btn-primary" type="button" (click)="openOnboardingWizard()">+ Onboard Tenant</button>
        </div>
      </header>

      <form [formGroup]="filterForm" class="filters">
        <label class="search-field">
          <span>Search</span>
          <input type="search" formControlName="search" placeholder="Search by name, slug, or contact" />
        </label>
        <div class="status-pills">
          <button
            type="button"
            [class.active]="filterForm.get('status')?.value === 'all'"
            (click)="setStatusFilter('all')"
          >
            All
          </button>
          <button
            type="button"
            [class.active]="filterForm.get('status')?.value === 'Active'"
            (click)="setStatusFilter('Active')"
          >
            Active
          </button>
          <button
            type="button"
            [class.active]="filterForm.get('status')?.value === 'Suspended'"
            (click)="setStatusFilter('Suspended')"
          >
            Suspended
          </button>
        </div>
      </form>

      <ng-container *ngIf="tenantsView$ | async as vm">
        <div class="tenant-stats">
          <div class="stat-card">
            <span class="label">Total tenants</span>
            <strong>{{ vm.total }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Active</span>
            <strong>{{ vm.stats.active }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Suspended</span>
            <strong>{{ vm.stats.suspended }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Showing</span>
            <strong>{{ vm.filteredTotal }}</strong>
          </div>
        </div>

        <div class="tenants-layout">
          <div class="table-wrapper">
            <div *ngIf="tenantsLoading()" class="inline-loading">
              <div class="spinner"></div>
              <p>Loading tenants...</p>
            </div>

            <table *ngIf="vm.items.length > 0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let tenant of vm.items"
                  (click)="selectTenant(tenant)"
                  [class.selected]="isSelected(tenant)"
                >
                  <td>
                    <div class="tenant-name">
                      <strong>{{ tenant.name }}</strong>
                      <small>{{ tenant.id.slice(0, 8) }}...</small>
                    </div>
                  </td>
                  <td><code>{{ tenant.slug }}</code></td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-active]="tenant.status === 'Active'"
                      [class.badge-suspended]="tenant.status === 'Suspended'"
                    >
                      {{ tenant.status }}
                    </span>
                  </td>
                  <td>{{ tenant.primaryContact }}</td>
                  <td>{{ tenant.audit?.createdDate | date : 'mediumDate' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="empty-state" *ngIf="!tenantsLoading() && vm.items.length === 0">
              <div class="empty-icon">🏢</div>
              <h3>No tenants match your filters</h3>
              <p>Try clearing the search or switch the status filter.</p>
              <button class="btn-secondary" type="button" (click)="setStatusFilter('all')">Reset filters</button>
            </div>
          </div>

          <aside class="tenant-detail" *ngIf="selectedTenant() as tenant">
            <header class="detail-header">
              <div>
                <p class="detail-eyebrow">Tenant detail</p>
                <h3>{{ tenant.name }}</h3>
                <p>{{ tenant.primaryContact }}</p>
              </div>
              <button class="btn-secondary" type="button" (click)="closeTenantDetail()">Close</button>
            </header>

            <div class="detail-slug">
              <code>{{ tenant.slug }}</code>
              <button class="btn-link" type="button" (click)="copyTenantSlug(tenant)">Copy slug</button>
            </div>

            <dl>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    class="badge"
                    [class.badge-active]="tenant.status === 'Active'"
                    [class.badge-suspended]="tenant.status === 'Suspended'"
                  >
                    {{ tenant.status }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{{ tenant.audit?.createdDate | date : 'medium' }}</dd>
              </div>
              <div>
                <dt>Modified</dt>
                <dd>{{ tenant.audit?.modifiedDate | date : 'medium' }}</dd>
              </div>
              <div>
                <dt>Tenant ID</dt>
                <dd>{{ tenant.id }}</dd>
              </div>
            </dl>

            <div class="detail-toast" *ngIf="tenantActionMessage()">
              {{ tenantActionMessage() }}
            </div>
          </aside>
        </div>
      </ng-container>
    </section>

    <app-tenant-onboarding-wizard
      #wizard
      (tenantCreated)="onTenantCreated($event)"
      (closed)="onWizardClosed()"
    ></app-tenant-onboarding-wizard>
  `,
  styles: [
    `
      .panel {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }
      .panel__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .panel__header h2 {
        margin: 0 0 0.25rem 0;
        font-size: 1.75rem;
        color: var(--premium-onyx);
        font-weight: 700;
      }
      .panel__header p {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 0.95rem;
      }
      .header-actions {
        display: flex;
        gap: 0.75rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
        align-items: flex-end;
      }
      .search-field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .search-field input {
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        transition: all 0.2s;
      }
      .search-field input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }
      .status-pills {
        display: flex;
        gap: 0.5rem;
      }
      .status-pills button {
        padding: 0.5rem 1rem;
        border-radius: 999px;
        border: 1px solid var(--premium-silver);
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      }
      .status-pills button:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      .status-pills button.active {
        background: rgba(183, 110, 121, 0.12);
        border-color: var(--premium-rose-gold);
        color: var(--premium-rose-gold);
        font-weight: 600;
      }
      .tenant-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .stat-card {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        box-shadow: 0 10px 30px var(--premium-shadow);
      }
      .stat-card .label {
        display: block;
        font-size: 0.8rem;
        color: var(--premium-titanium);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 600;
      }
      .stat-card strong {
        font-size: 1.75rem;
        color: var(--premium-onyx);
        font-weight: 800;
      }
      .tenants-layout {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
      }
      .table-wrapper {
        background: #fff;
        border-radius: 1rem;
        border: 1px solid var(--premium-silver);
        padding: 1rem;
        position: relative;
        box-shadow: 0 10px 30px var(--premium-shadow);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.75rem;
        border-bottom: 1px solid var(--premium-silver);
      }
      th {
        background: var(--premium-moonstone);
        text-transform: uppercase;
        font-size: 0.75rem;
        color: var(--premium-titanium);
        letter-spacing: 0.08em;
        font-weight: 600;
      }
      td {
        color: var(--premium-onyx);
      }
      tr {
        cursor: pointer;
        transition: background 0.2s;
      }
      tr:hover {
        background: var(--premium-moonstone);
      }
      tr.selected {
        background: rgba(183, 110, 121, 0.12);
      }
      code {
        background: rgba(183, 110, 121, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 0.35rem;
        font-family: monospace;
        font-size: 0.85rem;
        color: var(--premium-rose-gold);
      }
      .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      .badge-active {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      .badge-suspended {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }
      .inline-loading {
        text-align: center;
        padding: 2rem 1rem;
      }
      .spinner {
        width: 32px;
        height: 32px;
        border: 4px solid var(--premium-silver);
        border-top-color: var(--premium-rose-gold);
        border-radius: 50%;
        margin: 0 auto 0.75rem;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--premium-titanium);
      }
      .empty-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }
      .tenant-detail {
        background: #fff;
        border-radius: 1rem;
        border: 1px solid var(--premium-silver);
        padding: 1.5rem;
        box-shadow: 0 10px 30px var(--premium-shadow);
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .detail-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.3em;
        font-size: 0.7rem;
        color: var(--premium-titanium);
        margin: 0;
        font-weight: 600;
      }
      .detail-slug {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .btn-link {
        border: none;
        background: transparent;
        color: var(--premium-rose-gold);
        cursor: pointer;
        font-weight: 600;
        transition: color 0.2s;
      }
      .btn-link:hover {
        color: var(--premium-gold);
      }
      dl {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin: 0;
      }
      dt {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--premium-titanium);
        font-weight: 600;
      }
      dd {
        margin: 0.15rem 0 0;
        color: var(--premium-onyx);
        font-weight: 600;
      }
      .detail-toast {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid #10b981;
        border-radius: 0.5rem;
        color: #10b981;
        font-size: 0.85rem;
      }
      form {
        display: grid;
        gap: 1rem;
        max-width: 600px;
      }
      label {
        display: flex;
        flex-direction: column;
        font-weight: 600;
        color: var(--premium-onyx);
      }
      input {
        padding: 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        margin-top: 0.25rem;
        transition: all 0.2s;
      }
      input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }
      small {
        font-size: 0.75rem;
        color: var(--premium-titanium);
      }
      .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 0.5rem;
      }
      .btn-primary,
      .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-primary {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        border: none;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
      }
      .btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .btn-secondary {
        background: var(--premium-moonstone);
        border: 1px solid var(--premium-silver);
        color: var(--premium-onyx);
      }
      .btn-secondary:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      @media (max-width: 1024px) {
        .tenants-layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TenantsComponent implements OnInit {
  @ViewChild('wizard') wizard!: TenantOnboardingWizardComponent;

  tenantsView$!: Observable<TenantViewModel>;
  form: FormGroup;
  filterForm: FormGroup;
  showCreateForm = signal(false);
  readonly createInFlight = signal(false);
  selectedTenant = signal<Tenant | null>(null);
  tenantActionMessage = signal<string | null>(null);
  tenantsLoading = signal(false);

  private readonly refreshTenants$ = new BehaviorSubject<void>(undefined);

  constructor(
    private readonly tenantService: TenantService,
    private readonly fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      primaryContact: ['', [Validators.required, Validators.email]],
    });

    this.filterForm = this.fb.group({
      search: [''],
      status: ['all'],
    });
  }

  ngOnInit(): void {
    const tenants$ = this.refreshTenants$.pipe(
      tap(() => this.tenantsLoading.set(true)),
      switchMap(() =>
        this.tenantService.listTenants().pipe(finalize(() => this.tenantsLoading.set(false))),
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.tenantsView$ = combineLatest([
      tenants$,
      this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    ]).pipe(
      map(([response, filters]) =>
        this.buildViewModel(response, (filters?.search ?? '') as string, filters?.status as TenantStatusFilter)
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  setStatusFilter(status: TenantStatusFilter): void {
    this.filterForm.patchValue({ status });
  }

  refreshTenants(): void {
    this.refreshTenants$.next(undefined);
  }

  createTenant(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.createInFlight.set(true);
    this.tenantService
      .createTenant({
        name: this.form.value.name,
        slug: this.form.value.slug,
        primaryContact: this.form.value.primaryContact,
      })
      .subscribe({
        next: () => {
          this.form.reset();
          this.showCreateForm.set(false);
          this.createInFlight.set(false);
          this.showTenantActionMessage('Tenant created successfully');
          this.refreshTenants();
        },
        error: () => this.createInFlight.set(false),
      });
  }

  cancelCreate(): void {
    this.form.reset();
    this.showCreateForm.set(false);
  }

  openOnboardingWizard(): void {
    if (this.wizard) {
      this.wizard.openWizard();
    }
  }

  onTenantCreated(tenant: Tenant): void {
    this.showTenantActionMessage(`Tenant "${tenant.name}" onboarded successfully!`);
    this.refreshTenants();
  }

  onWizardClosed(): void {
    // Wizard closed, no action needed
  }

  selectTenant(tenant: Tenant): void {
    this.selectedTenant.set(tenant);
  }

  isSelected(tenant: Tenant): boolean {
    return this.selectedTenant()?.id === tenant.id;
  }

  closeTenantDetail(): void {
    this.selectedTenant.set(null);
  }

  copyTenantSlug(tenant: Tenant): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(tenant.slug)
        .then(() => this.showTenantActionMessage('Slug copied to clipboard'))
        .catch(() => this.showTenantActionMessage('Unable to copy slug'));
      return;
    }
    this.showTenantActionMessage('Clipboard not supported');
  }

  private buildViewModel(response: TenantListResponse, searchRaw: string, status?: TenantStatusFilter): TenantViewModel {
    const search = (searchRaw ?? '').toLowerCase().trim();
    const statusFilter: TenantStatusFilter = status ?? 'all';

    const filteredItems = response.items.filter((tenant) => {
      const matchesSearch =
        !search ||
        tenant.name.toLowerCase().includes(search) ||
        tenant.slug.toLowerCase().includes(search) ||
        tenant.primaryContact.toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'all' ? true : tenant.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const stats = {
      active: response.items.filter((tenant) => tenant.status === 'Active').length,
      suspended: response.items.filter((tenant) => tenant.status === 'Suspended').length,
    };

    return {
      items: filteredItems,
      total: response.total,
      filteredTotal: filteredItems.length,
      stats,
    };
  }

  private showTenantActionMessage(message: string): void {
    this.tenantActionMessage.set(message);
    setTimeout(() => this.tenantActionMessage.set(null), 2500);
  }
}

