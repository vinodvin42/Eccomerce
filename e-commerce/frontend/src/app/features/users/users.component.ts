import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { UserService } from '../../core/services/user.service';
import type { User, UserListResponse } from '../../shared/models/user';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, ReactiveFormsModule, FormsModule, ModalComponent],
  template: `
    <section class="panel">
      <header class="panel__header">
        <div>
          <h2>User Management</h2>
          <p>Manage users and their roles · {{ totalUsers() }} total</p>
        </div>
        <button class="btn-primary" (click)="showCreateForm.set(true)">+ New User</button>
      </header>

      <div class="filters">
        <div class="search-container">
          <input
            type="search"
            placeholder="Search name, email, or username..."
            [value]="searchTerm()"
            (input)="onSearch($event)"
          />
          <span class="search-icon">🔍</span>
        </div>
        <select (change)="onRoleFilterChange($event)" [value]="roleFilter()">
          <option value="">All Roles</option>
          <option value="Customer">Customer</option>
          <option value="Staff">Staff</option>
          <option value="TenantAdmin">Tenant Admin</option>
        </select>
        <select (change)="onStatusFilterChange($event)" [value]="statusFilter()">
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Suspended">Suspended</option>
        </select>
        <button
          class="btn-secondary"
          type="button"
          (click)="resetFilters()"
          [disabled]="loading() || (!searchTerm() && !roleFilter() && statusFilter() === 'all')"
        >
          Clear
        </button>
        <button class="btn-secondary" type="button" (click)="loadUsers()" [disabled]="loading()">Refresh</button>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <div class="spinner"></div>
        <p>Loading users...</p>
      </div>

      <div *ngIf="error() && !loading()" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>{{ error() }}</p>
        <button class="btn-secondary" (click)="loadUsers()">Retry</button>
      </div>

      <ng-container *ngIf="!loading() && !error() && (users$ | async) as users">
        <div *ngIf="users.items.length > 0; else emptyUsers" class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>MFA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users.items">
                <td>{{ user.full_name }}</td>
                <td>{{ user.email }}</td>
                <td><code>{{ user.username }}</code></td>
                <td>
                  <span [class]="'badge badge-role-' + user.role.toLowerCase()">
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span [class]="'badge badge-' + user.status.toLowerCase()">
                    {{ user.status }}
                  </span>
                </td>
                <td>{{ user.mfa_enabled ? '✓' : '✗' }}</td>
                <td>
                  <button class="btn-sm" (click)="editUser(user)">Edit</button>
                  <button class="btn-sm btn-danger" (click)="deleteUser(user.id)" [disabled]="deleteInFlight()">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="pagination-controls">
            <button
              class="btn-secondary"
              type="button"
              (click)="changePage('prev', users.total)"
              [disabled]="page() === 1 || loading()"
            >
              ← Prev
            </button>
            <span class="page-info">
              Page {{ page() }} of {{ getTotalPages(users.total) }} · {{ users.total }} users
            </span>
            <button
              class="btn-secondary"
              type="button"
              (click)="changePage('next', users.total)"
              [disabled]="page() >= getTotalPages(users.total) || loading()"
            >
              Next →
            </button>
            <label class="page-size-label">
              Show
              <select class="page-size-select" (change)="onPageSizeChange($event)" [value]="pageSize()">
                <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }} / page</option>
              </select>
            </label>
          </div>
        </div>
        <ng-template #emptyUsers>
          <div class="empty-state">
            <p>No users match the current filters.</p>
          </div>
        </ng-template>
      </ng-container>
    </section>

    <!-- User Form Modal -->
    <app-modal [isOpen]="showCreateForm() || editingUser() !== null" [title]="editingUser() ? 'Edit User' : 'Create New User'" (closeModal)="cancelEdit()">
      <form [formGroup]="form" (ngSubmit)="saveUser()">
        <label>
          Full Name
          <input formControlName="fullName" type="text" />
        </label>
        <label>
          Email
          <input formControlName="email" type="email" />
        </label>
        <label>
          Username
          <input formControlName="username" type="text" />
        </label>
        <label *ngIf="!editingUser()">
          Password
          <input formControlName="password" type="password" />
        </label>
        <label>
          Role
          <select formControlName="role">
            <option value="Customer">Customer</option>
            <option value="Staff">Staff</option>
            <option value="TenantAdmin">Tenant Admin</option>
          </select>
        </label>
        <label *ngIf="editingUser()">
          Status
          <select formControlName="status">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="cancelEdit()">Cancel</button>
          <button type="submit" [disabled]="form.invalid || saveInFlight()">
            {{ editingUser() ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [
    `
      .panel {
        background: #fff;
        padding: 1.5rem;
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
        margin-bottom: 1rem;
      }
      .panel__header h2 {
        color: var(--premium-onyx);
      }
      .filters {
        margin-bottom: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }

      .filters input[type='search'],
      .filters select {
        padding: 0.65rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
      }

      .filters input[type='search']:focus,
      .filters select:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }
      select {
        padding: 0.5rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
      }

      .search-container {
        position: relative;
      }

      .search-container input {
        padding-left: 2.25rem;
      }

      .search-icon {
        position: absolute;
        top: 50%;
        left: 0.75rem;
        transform: translateY(-50%);
        color: var(--premium-titanium);
        pointer-events: none;
      }

      .loading-state,
      .error-state,
      .empty-state {
        text-align: center;
        padding: 2rem 1rem;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 4px solid var(--premium-silver);
        border-top-color: var(--premium-rose-gold);
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .error-state {
        color: var(--premium-rose-gold);
      }

      .error-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
      }

      .empty-state {
        color: var(--premium-titanium);
      }

      .pagination-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      .page-info {
        color: var(--premium-onyx);
        font-weight: 600;
      }

      .page-size-label {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--premium-titanium);
      }

      .page-size-select {
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
      }
      .table-wrapper {
        overflow-x: auto;
        margin-top: 1rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        background: var(--premium-moonstone);
        text-align: left;
        padding: 0.75rem;
        border-bottom: 2px solid var(--premium-silver);
        color: var(--premium-titanium);
        font-weight: 600;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      td {
        text-align: left;
        padding: 0.75rem;
        border-bottom: 1px solid var(--premium-silver);
        color: var(--premium-onyx);
      }
      tbody tr:hover {
        background: var(--premium-moonstone);
      }
      .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.875rem;
        font-weight: 600;
      }
      .badge-active {
        background: #10b981;
        color: #fff;
      }
      .badge-inactive,
      .badge-suspended {
        background: #ef4444;
        color: #fff;
      }
      .badge-role-customer {
        background: #3b82f6;
        color: #fff;
      }
      .badge-role-staff {
        background: #8b5cf6;
        color: #fff;
      }
      .badge-role-tenantadmin {
        background: #f59e0b;
        color: #fff;
      }
      .btn-primary {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 999px;
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
        transition: all 0.2s;
      }
      .btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .btn-sm {
        padding: 0.5rem 1rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        cursor: pointer;
        font-size: 0.875rem;
        margin-right: 0.5rem;
        transition: all 0.2s;
      }
      .btn-sm:hover:not(:disabled) {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      .btn-danger {
        color: #ef4444;
        border-color: #ef4444;
      }
      .btn-danger:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.1);
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
        color: #c4b5fd;
      }
      input,
      select {
        padding: 0.5rem;
        border-radius: 0.5rem;
        border: 1px solid #1e293b;
        background: #020617;
        color: #f8fafc;
        margin-top: 0.25rem;
      }
      .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }
      .btn-secondary {
        padding: 0.75rem 1.5rem;
        border: 1px solid #1e293b;
        border-radius: 999px;
        background: transparent;
        color: #f8fafc;
        font-weight: bold;
        cursor: pointer;
      }
      button[type='submit'] {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 999px;
        background: #38bdf8;
        color: #0f172a;
        font-weight: bold;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      code {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
      }
    `,
  ],
})
export class UsersComponent implements OnInit {
  users$!: Observable<UserListResponse>;
  form: FormGroup;
  showCreateForm = signal(false);
  editingUser = signal<User | null>(null);
  roleFilter = signal<string>('');
  statusFilter = signal<'all' | 'Active' | 'Inactive' | 'Suspended'>('all');
  searchTerm = signal<string>('');
  page = signal(1);
  pageSize = signal(20);
  readonly pageSizeOptions = [10, 20, 50];
  totalUsers = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);
  saveInFlight = signal(false);
  deleteInFlight = signal(false);
  private readonly search$ = new BehaviorSubject<string>('');
  private readonly roleFilter$ = new BehaviorSubject<string>('');
  private readonly statusFilter$ = new BehaviorSubject<'all' | 'Active' | 'Inactive' | 'Suspended'>('all');
  private readonly page$ = new BehaviorSubject<number>(1);
  private readonly pageSize$ = new BehaviorSubject<number>(20);
  private readonly refreshTrigger$ = new BehaviorSubject<void>(undefined);

  constructor(
    private readonly userService: UserService,
    private readonly fb: FormBuilder,
    private readonly destroyRef: DestroyRef
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.minLength(8)]],
      role: ['Customer', Validators.required],
      status: ['Active'],
    });
  }

  ngOnInit(): void {
    this.users$ = combineLatest([
      this.page$,
      this.pageSize$,
      this.roleFilter$,
      this.statusFilter$,
      this.search$,
      this.refreshTrigger$,
    ]).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(([page, pageSize, role, status, searchTerm, _refresh]) =>
        this.userService.listUsers(page, pageSize, undefined, role || undefined).pipe(
          map((response) => this.applyUserFilters(response, status, searchTerm)),
          catchError((err) => {
            this.error.set(err.error?.detail || 'Failed to load users');
            return of({ items: [], total: 0, page, pageSize });
          })
        )
      ),
      tap((response) => {
        this.loading.set(false);
        this.totalUsers.set(response.total);
        if (this.page() !== response.page) {
          this.page.set(response.page);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.loadUsers();
  }

  loadUsers(): void {
    this.refreshTrigger$.next(undefined);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.searchTerm.set(value);
    this.search$.next(value);
    this.resetPagination();
  }

  onRoleFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.roleFilter.set(value);
    this.roleFilter$.next(value);
    this.resetPagination();
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'all' | 'Active' | 'Inactive' | 'Suspended';
    this.statusFilter.set(value);
    this.statusFilter$.next(value);
    this.resetPagination();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.search$.next('');
    this.roleFilter.set('');
    this.roleFilter$.next('');
    this.statusFilter.set('all');
    this.statusFilter$.next('all');
    this.resetPagination();
  }

  changePage(direction: 'prev' | 'next', total: number): void {
    const totalPages = this.getTotalPages(total);
    const current = this.page();
    if (direction === 'prev' && current > 1) {
      this.setPage(current - 1);
    }
    if (direction === 'next' && current < totalPages) {
      this.setPage(current + 1);
    }
  }

  onPageSizeChange(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(size) && size > 0 && size !== this.pageSize()) {
      this.pageSize.set(size);
      this.pageSize$.next(size);
      this.setPage(1);
    }
  }

  getTotalPages(total: number): number {
    return Math.max(1, Math.ceil(Math.max(total, 0) / this.pageSize()));
  }

  private setPage(page: number): void {
    this.page.set(page);
    this.page$.next(page);
  }

  private resetPagination(): void {
    if (this.page() !== 1) {
      this.setPage(1);
    } else {
      this.loadUsers();
    }
  }

  editUser(user: User): void {
    this.editingUser.set(user);
    this.showCreateForm.set(false);
    this.form.patchValue({
      fullName: user.full_name,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
  }

  cancelEdit(): void {
    this.showCreateForm.set(false);
    this.editingUser.set(null);
    this.form.reset();
    this.form.get('role')?.setValue('Customer');
    this.form.get('status')?.setValue('Active');
  }

  saveUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveInFlight.set(true);
    const user = this.editingUser();

    if (user) {
      // Update existing user
      this.userService
        .updateUser(user.id, {
          full_name: this.form.value.fullName,
          email: this.form.value.email,
          username: this.form.value.username,
          role: this.form.value.role,
          status: this.form.value.status,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.cancelEdit();
            this.loadUsers();
            this.saveInFlight.set(false);
          },
          error: () => this.saveInFlight.set(false),
        });
    } else {
      // Create new user
      this.userService
        .createUser({
          full_name: this.form.value.fullName,
          email: this.form.value.email,
          username: this.form.value.username,
          password: this.form.value.password,
          role: this.form.value.role,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.cancelEdit();
            this.loadUsers();
            this.saveInFlight.set(false);
          },
          error: () => this.saveInFlight.set(false),
        });
    }
  }

  deleteUser(userId: string): void {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    this.deleteInFlight.set(true);
    this.userService
      .deleteUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadUsers();
          this.deleteInFlight.set(false);
        },
        error: () => this.deleteInFlight.set(false),
      });
  }

  private applyUserFilters(
    response: UserListResponse,
    statusFilter: 'all' | 'Active' | 'Inactive' | 'Suspended',
    searchTerm: string
  ): UserListResponse {
    const normalizedSearch = searchTerm.toLowerCase();
    const filteredItems = response.items.filter((user) => {
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.username.toLowerCase().includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });

    return {
      ...response,
      items: filteredItems,
    };
  }
}

