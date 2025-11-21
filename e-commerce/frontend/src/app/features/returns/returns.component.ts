import { AsyncPipe, CurrencyPipe, DatePipe, NgClass, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ReturnService } from '../../core/services/return.service';
import type { ReturnRequest, ReturnStatus } from '../../shared/models/returns';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgClass,
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
  ],
  template: `
    <div class="returns-page">
      <header class="page-hero">
        <div>
          <p class="eyebrow">Reverse logistics</p>
          <h1>Returns & Refunds Control Center</h1>
          <p>Track shopper-initiated returns, automate approvals, and keep refund SLAs on point.</p>
        </div>
        <button class="btn-secondary" type="button" (click)="reload()">↻ Refresh</button>
      </header>

      <section class="alerts">
        <div *ngIf="successMessage()" class="alert success">
          {{ successMessage() }}
          <button type="button" (click)="successMessage.set(null)">✕</button>
        </div>
        <div *ngIf="errorMessage()" class="alert danger">
          {{ errorMessage() }}
          <button type="button" (click)="errorMessage.set(null)">✕</button>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <header>
            <div>
              <p class="eyebrow">Customer care</p>
              <h2>Manually log a return</h2>
            </div>
          </header>
          <form [formGroup]="createForm" (ngSubmit)="submitReturnRequest()" class="form-stack">
            <label>
              <span>Order ID</span>
              <input type="text" formControlName="orderId" placeholder="UUID from order" />
              <small *ngIf="orderIdControl.invalid && orderIdControl.touched" class="error">Order ID is required.</small>
            </label>
            <label>
              <span>Reason</span>
              <textarea rows="3" formControlName="reason" placeholder="Describe why the customer is returning the order"></textarea>
              <small *ngIf="reasonControl.invalid && reasonControl.touched" class="error">Please provide at least 10 characters.</small>
            </label>
            <button class="btn-primary" type="submit" [disabled]="createForm.invalid || loading()">Create return request</button>
          </form>
        </article>

        <article class="card">
          <header>
            <div>
              <p class="eyebrow">Actions</p>
              <h2>Selected return</h2>
            </div>
          </header>
          <ng-container *ngIf="selectedReturn(); else selectPrompt">
            <div class="selected-meta">
              <p>
                <strong>Return ID:</strong> {{ selectedReturn()!.id.slice(0, 8) }}…
              </p>
              <p>
                <strong>Status:</strong>
                <span class="status-pill" [attr.data-status]="selectedReturn()!.status.toLowerCase()">
                  {{ selectedReturn()!.status }}
                </span>
              </p>
            </div>

            <div class="detail-grid">
              <section class="mini-card">
                <p class="label">Customer</p>
                <h4>{{ selectedReturn()?.customer?.name || 'Unknown customer' }}</h4>
                <p>{{ selectedReturn()?.customer?.email || '—' }}</p>
                <small>ID: {{ selectedReturn()!.customerId.slice(0, 8) }}…</small>
              </section>
              <section class="mini-card" *ngIf="selectedReturn()?.order as order">
                <p class="label">Order snapshot</p>
                <h4>{{ order.total.amount | currency : order.total.currency }}</h4>
                <p>Placed {{ order.placedAt | date : 'medium' }}</p>
                <small>{{ order.itemCount }} item(s)</small>
              </section>
              <section class="mini-card">
                <p class="label">Reason</p>
                <h4>Feedback</h4>
                <p class="reason-snippet">{{ selectedReturn()?.reason }}</p>
              </section>
            </div>

            <section class="insight-card" *ngIf="selectedReturn()?.order?.items?.length">
              <header>
                <h3>Items in this return</h3>
                <p>{{ selectedReturn()!.order!.items.length }} line item(s)</p>
              </header>
              <ul class="item-list">
                <li *ngFor="let item of selectedReturn()!.order!.items">
                  <div class="item-info">
                    <div class="item-thumb" *ngIf="item.imageUrl">
                      <img [src]="item.imageUrl" alt="" />
                    </div>
                    <div>
                      <p class="item-name">{{ item.productName || 'Product #' + item.productId.slice(0, 8) }}</p>
                      <small>{{ item.quantity }} × {{ item.unitPrice.amount | currency : item.unitPrice.currency }} • SKU {{ item.sku || 'n/a' }}</small>
                    </div>
                  </div>
                  <strong>{{ item.lineTotal.amount | currency : item.lineTotal.currency }}</strong>
                </li>
              </ul>
            </section>

            <form [formGroup]="approvalForm" (ngSubmit)="approveSelected()" class="form-stack">
              <h3>Approve return</h3>
              <label>
                <span>Resolution notes</span>
                <textarea rows="3" formControlName="resolutionNotes" placeholder="Internal notes or next steps"></textarea>
              </label>
              <label class="checkbox">
                <input type="checkbox" formControlName="autoRefund" />
                <span>Auto refund upon approval</span>
              </label>
              <label *ngIf="approvalForm.controls.autoRefund.value">
                <span>Override refund amount (optional)</span>
                <input type="number" min="0" step="0.01" formControlName="refundAmount" placeholder="Use order total by default" />
              </label>
              <button class="btn-primary" type="submit" [disabled]="approvalForm.invalid || loading()">Approve return</button>
            </form>

            <form [formGroup]="rejectionForm" (ngSubmit)="rejectSelected()" class="form-stack">
              <h3>Reject return</h3>
              <label>
                <span>Resolution notes</span>
                <textarea rows="2" formControlName="resolutionNotes" placeholder="Reason for rejection"></textarea>
              </label>
              <small *ngIf="rejectionForm.invalid && rejectionForm.touched" class="error">Please add a short explanation.</small>
              <button class="btn-danger" type="submit" [disabled]="rejectionForm.invalid || loading()">Reject return</button>
            </form>

            <form [formGroup]="refundForm" (ngSubmit)="refundSelected()" class="form-stack">
              <h3>Manual refund</h3>
              <label>
                <span>Refund amount</span>
                <input type="number" min="0" step="0.01" formControlName="amount" placeholder="Leave empty for full refund" />
              </label>
              <label>
                <span>Reason</span>
                <input type="text" formControlName="reason" placeholder="Visible in provider logs" />
              </label>
              <button class="btn-secondary" type="submit" [disabled]="loading()">Trigger refund</button>
            </form>
          </ng-container>
          <ng-template #selectPrompt>
            <p>Select a return from the table to manage approvals and refunds.</p>
          </ng-template>
        </article>
      </section>

      <section class="filters">
        <label>
          <span>Status</span>
          <select [value]="statusFilter()" (change)="changeFilter($event.target.value)">
            <option value="All">All statuses</option>
            <option *ngFor="let option of statusOptions" [value]="option">
              {{ option }}
            </option>
          </select>
        </label>
        <div class="spacer"></div>
        <div>Showing {{ returns().length }} of {{ total() }} results</div>
      </section>

      <div class="table-wrapper" [class.loading]="loading()">
        <table>
          <thead>
            <tr>
              <th>Return</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Refund</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let request of returns()"
              (click)="selectReturn(request)"
              [class.active]="selectedReturn()?.id === request.id"
            >
              <td>{{ request.id.slice(0, 8) }}…</td>
              <td>
                <div class="customer-cell">
                  <strong>{{ request.customer?.name || request.customerId.slice(0, 8) + '…' }}</strong>
                  <small>{{ request.customer?.email || '—' }}</small>
                </div>
              </td>
              <td class="items-cell">
                <strong>{{ request.order?.itemCount || 0 }}</strong>
                <small *ngIf="request.order?.items?.length">
                  Top item:
                  {{
                    request.order?.items?.[0]?.productName ||
                      (request.order?.items?.[0]?.productId ? request.order?.items?.[0]?.productId.slice(0, 8) + '…' : 'n/a')
                  }}
                </small>
              </td>
              <td class="reason-cell">
                <span>{{ request.reason }}</span>
              </td>
              <td>
                <span class="status-pill" [attr.data-status]="request.status.toLowerCase()">{{ request.status }}</span>
              </td>
              <td>{{ request.audit.createdDate | date : 'medium' }}</td>
              <td>
                <ng-container *ngIf="request.refundTransactionId; else pendingRefund">
                  <ng-container *ngIf="request.refundAmount != null; else pendingAmount">
                    {{ (request.refundAmount ?? 0) | currency : (request.refundCurrency || 'USD') }}
                  </ng-container>
                  <ng-template #pendingAmount>Processing…</ng-template>
                </ng-container>
                <ng-template #pendingRefund>—</ng-template>
              </td>
            </tr>
            <tr *ngIf="!returns().length && !loading()">
              <td colspan="7" class="empty-state">No return requests found for this filter.</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="loading()" class="loading-overlay">Loading returns…</div>
      </div>

      <footer class="pagination">
        <button type="button" (click)="previousPage()" [disabled]="page() === 1 || loading()">« Prev</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button type="button" (click)="nextPage()" [disabled]="page() >= totalPages() || loading()">Next »</button>
      </footer>
    </div>
  `,
  styles: [
    `
      .page-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
        margin-bottom: 2rem;
      }
      .page-hero h1 {
        margin: 0.5rem 0;
        font-size: 2.25rem;
        font-weight: 800;
        color: var(--premium-onyx);
        letter-spacing: -0.01em;
      }
      .eyebrow {
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        color: var(--premium-rose-gold);
        margin: 0 0 0.5rem 0;
        font-weight: 600;
      }
      .alerts .alert {
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .alert.success {
        background: #ecfdf5;
        color: #047857;
      }
      .alert.danger {
        background: #fef2f2;
        color: #b91c1c;
      }
      .grid {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      }
      .card {
        background: #fff;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }
      .form-stack {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.9rem;
        color: #1f2937;
      }
      input,
      textarea,
      select {
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        padding: 0.75rem 1rem;
        font-size: 0.95rem;
        transition: border 0.2s, box-shadow 0.2s;
      }
      input:focus,
      textarea:focus,
      select:focus {
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
        outline: none;
      }
      textarea {
        resize: vertical;
      }
      .checkbox {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }
      .filters {
        display: flex;
        gap: 1rem;
        align-items: center;
        background: #fff;
        padding: 1rem 1.5rem;
        border-radius: 1rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
        margin-bottom: 1.5rem;
      }
      .table-wrapper {
        position: relative;
        background: #fff;
        border-radius: 1rem;
        overflow: hidden;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #f3f4f6;
      }
      th {
        background: var(--premium-moonstone);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--premium-titanium);
        font-weight: 600;
      }
      tbody tr {
        cursor: pointer;
        transition: background 0.15s;
      }
      tbody tr:hover {
        background: var(--premium-moonstone);
      }
      tbody tr.active {
        background: rgba(183, 110, 121, 0.12);
      }
      .status-pill {
        display: inline-flex;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: capitalize;
      }
      .status-pill[data-status='pending'] {
        background: #fef3c7;
        color: #92400e;
      }
      .status-pill[data-status='approved'] {
        background: #dcfce7;
        color: #166534;
      }
      .status-pill[data-status='rejected'] {
        background: #fee2e2;
        color: #b91c1c;
      }
      .status-pill[data-status='refunded'] {
        background: #e0f2fe;
        color: #0369a1;
      }
      .loading-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(255, 255, 255, 0.7);
        font-weight: 600;
      }
      .pagination {
        display: flex;
        justify-content: center;
        gap: 1rem;
        align-items: center;
      }
      .pagination button {
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 999px;
        background: #f3f4f6;
        cursor: pointer;
      }
      .empty-state {
        text-align: center;
        color: #9ca3af;
        padding: 2rem 1rem;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      .mini-card {
        background: #f9fafb;
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .mini-card .label {
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        color: #6b7280;
      }
      .mini-card h4 {
        margin: 0;
        font-size: 1rem;
      }
      .reason-snippet {
        max-height: 3.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .insight-card {
        background: linear-gradient(120deg, rgba(212, 175, 55, 0.15), rgba(183, 110, 121, 0.15));
        border: 1px solid var(--premium-rose-gold);
        border-radius: 1rem;
        padding: 1rem;
        margin-bottom: 1rem;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.2);
      }
      .insight-card header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.75rem;
      }
      .item-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .item-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f3f4f6;
      }
      .item-info {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }
      .item-thumb {
        width: 48px;
        height: 48px;
        border-radius: 0.5rem;
        overflow: hidden;
        background: #fff;
        border: 1px solid #f3f4f6;
      }
      .item-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .item-name {
        margin: 0;
        font-weight: 600;
      }
      .customer-cell {
        display: flex;
        flex-direction: column;
      }
      .items-cell {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .reason-cell span {
        display: inline-block;
        max-width: 240px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ],
})
export class ReturnsComponent implements OnInit {
  private readonly pageSize = 10;
  readonly statusOptions: ReturnStatus[] = ['Pending', 'Approved', 'Rejected', 'Refunded'];

  returns = signal<ReturnRequest[]>([]);
  selectedReturn = signal<ReturnRequest | null>(null);
  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  page = signal(1);
  total = signal(0);
  statusFilter = signal<ReturnStatus | 'All'>('All');

  readonly createForm = this.fb.nonNullable.group({
    orderId: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(10)]],
  });

  readonly approvalForm = this.fb.nonNullable.group({
    resolutionNotes: [''],
    autoRefund: [false],
    refundAmount: [null as number | null],
  });

  readonly rejectionForm = this.fb.nonNullable.group({
    resolutionNotes: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly refundForm = this.fb.nonNullable.group({
    amount: [null as number | null],
    reason: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly returnService: ReturnService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.loadReturns();
  }

  get orderIdControl() {
    return this.createForm.controls.orderId;
  }

  get reasonControl() {
    return this.createForm.controls.reason;
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  changeFilter(value: string): void {
    this.statusFilter.set((value as ReturnStatus) || 'All');
    this.page.set(1);
    this.loadReturns();
  }

  selectReturn(request: ReturnRequest): void {
    this.selectedReturn.set(request);
    this.approvalForm.reset({
      resolutionNotes: '',
      autoRefund: false,
      refundAmount: null,
    });
    this.rejectionForm.reset({
      resolutionNotes: '',
    });
    this.refundForm.reset();
  }

  submitReturnRequest(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.returnService
      .createReturnRequest(this.createForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.successMessage.set(`Return request ${response.id.slice(0, 8)}… logged successfully.`);
          this.errorMessage.set(null);
          this.createForm.reset();
          this.loadReturns();
        },
        error: (error) => {
          this.errorMessage.set(error.error?.detail || 'Failed to create return request.');
          this.successMessage.set(null);
          this.loading.set(false);
        },
      });
  }

  approveSelected(): void {
    if (!this.selectedReturn()) {
      return;
    }
    this.loading.set(true);
    this.returnService
      .approveReturn(this.selectedReturn()!.id, this.approvalForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.successMessage.set(`Return ${response.id.slice(0, 8)}… approved.`);
          this.errorMessage.set(null);
          this.selectedReturn.set(response);
          this.loadReturns(false);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.detail || 'Failed to approve return.');
          this.successMessage.set(null);
          this.loading.set(false);
        },
      });
  }

  rejectSelected(): void {
    if (!this.selectedReturn()) {
      return;
    }
    this.loading.set(true);
    this.returnService
      .rejectReturn(this.selectedReturn()!.id, this.rejectionForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.successMessage.set(`Return ${response.id.slice(0, 8)}… rejected.`);
          this.errorMessage.set(null);
          this.selectedReturn.set(response);
          this.loadReturns(false);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.detail || 'Failed to reject return.');
          this.successMessage.set(null);
          this.loading.set(false);
        },
      });
  }

  refundSelected(): void {
    if (!this.selectedReturn()) {
      return;
    }
    this.loading.set(true);
    this.returnService
      .refundReturn(this.selectedReturn()!.id, this.refundForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.successMessage.set(`Refund initiated for return ${response.id.slice(0, 8)}…`);
          this.errorMessage.set(null);
          this.selectedReturn.set(response);
          this.loadReturns(false);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.detail || 'Failed to trigger refund.');
          this.successMessage.set(null);
          this.loading.set(false);
        },
      });
  }

  previousPage(): void {
    if (this.page() === 1) {
      return;
    }
    this.page.update((value) => Math.max(1, value - 1));
    this.loadReturns();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.loadReturns();
  }

  reload(): void {
    this.loadReturns();
  }

  private loadReturns(resetLoading = true): void {
    if (resetLoading) {
      this.loading.set(true);
    }
    const status = this.statusFilter();
    this.returnService
      .listReturns(this.page(), this.pageSize, status === 'All' ? undefined : status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.returns.set(response.items);
          this.total.set(response.total);
          this.loading.set(false);
          if (this.selectedReturn()) {
            const updated = response.items.find((item) => item.id === this.selectedReturn()!.id);
            if (updated) {
              this.selectedReturn.set(updated);
            }
          }
        },
        error: (error) => {
          this.errorMessage.set(error.error?.detail || 'Failed to load returns.');
          this.successMessage.set(null);
          this.loading.set(false);
        },
      });
  }
}

