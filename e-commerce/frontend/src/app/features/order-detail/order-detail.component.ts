import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, of } from 'rxjs';

import { OrderService } from '../../core/services/order.service';
import { ReturnService } from '../../core/services/return.service';
import type { Order } from '../../shared/models/order';
import type { ReturnRequest } from '../../shared/models/returns';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, CurrencyPipe, DatePipe, TitleCasePipe, RouterLink, ReactiveFormsModule],
  template: `
    <div class="order-detail-page">
      <div class="order-shell" *ngIf="order$ | async as order; else loadingState">
        <header class="order-header">
          <div>
            <a routerLink="/my-orders" class="back-link">← Back to My Orders</a>
            <p class="eyebrow">Order {{ order.id.slice(0, 8) }}</p>
            <h1>Tracking your brilliance</h1>
            <p>Placed on {{ order.audit.createdDate | date : 'fullDate' }}</p>
          </div>
          <span class="status-pill" [attr.data-status]="order.status.toLowerCase()">
            {{ order.status | titlecase }}
          </span>
        </header>

        <div class="order-grid">
          <section class="summary-card">
            <h2>Order Snapshot</h2>
            <dl>
              <div>
                <dt>Total Paid</dt>
                <dd>{{ order.total.amount | currency : order.total.currency }}</dd>
              </div>
              <div>
                <dt>Items</dt>
                <dd>{{ order.items.length }}</dd>
              </div>
              <div>
                <dt>Shipping Address</dt>
                <dd>{{ order.shippingAddress || 'Provided during checkout' }}</dd>
              </div>
            </dl>

            <div class="timeline">
              <div class="timeline-step active">
                <div class="dot"></div>
                <span>Order received</span>
              </div>
              <div class="bar" [class.active]="order.status !== 'PendingPayment'"></div>
              <div class="timeline-step" [class.active]="order.status !== 'PendingPayment'">
                <div class="dot"></div>
                <span>Payment confirmed</span>
              </div>
              <div class="bar" [class.active]="order.status === 'Confirmed'"></div>
              <div class="timeline-step" [class.active]="order.status === 'Confirmed'">
                <div class="dot"></div>
                <span>Ready to ship</span>
              </div>
            </div>
          </section>
          <section class="payment-card">
            <h2>Payment summary</h2>
            <div class="payment-breakdown">
              <div>
                <span>Merchandise</span>
                <strong>{{ getOrderSubtotal(order) | currency : order.total.currency }}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>{{ order.shippingAddress ? 'Included' : 'At pickup' }}</strong>
              </div>
              <div class="grand-total">
                <span>Total charged</span>
                <strong>{{ order.total.amount | currency : order.total.currency }}</strong>
              </div>
            </div>
            <p class="muted">
              Mirrors the checkout confirmation so finance and CX teams see the same numbers.
            </p>
          </section>
          <section class="return-card" *ngIf="order.status === 'Confirmed'">
            <div class="return-card__header">
              <div>
                <p class="eyebrow">Need to return?</p>
                <h2>Request a return</h2>
                <p>Submit a return request and our stylists will assist you.</p>
              </div>
              <span *ngIf="existingReturn()" class="status-pill" [attr.data-status]="existingReturn()!.status.toLowerCase()">
                {{ existingReturn()!.status | titlecase }}
              </span>
            </div>

            <div *ngIf="returnLoading()" class="alert muted">Checking existing return requests…</div>

            <ng-container *ngIf="existingReturn(); else requestForm">
              <p>
                Return request <strong>#{{ existingReturn()!.id.slice(0, 8) }}</strong> is currently
                {{ existingReturn()!.status | titlecase }}.
              </p>
              <p *ngIf="existingReturn()!.resolutionNotes">
                <strong>Notes:</strong> {{ existingReturn()!.resolutionNotes }}
              </p>
              <p *ngIf="existingReturn()!.refundTransactionId">
                <strong>Refund reference:</strong> {{ existingReturn()!.refundTransactionId?.slice(0, 10) }}…
              </p>
            </ng-container>

            <ng-template #requestForm>
              <form [formGroup]="returnForm" (ngSubmit)="submitReturn(order.id)">
                <label>
                  <span>Tell us about the issue</span>
                  <textarea rows="4" formControlName="reason" placeholder="Example: Wrong size, damaged packaging"></textarea>
                  <small *ngIf="returnForm.invalid && returnForm.touched" class="form-error">
                    Please provide at least 10 characters.
                  </small>
                </label>
                <button class="btn-gold" type="submit" [disabled]="returnForm.invalid || returnLoading()">Request return</button>
              </form>
            </ng-template>

            <div *ngIf="returnSuccess()" class="alert success">
              {{ returnSuccess() }}
              <button type="button" (click)="returnSuccess.set(null)">✕</button>
            </div>
            <div *ngIf="returnError()" class="alert danger">
              {{ returnError() }}
              <button type="button" (click)="returnError.set(null)">✕</button>
            </div>
          </section>
          <section class="items-card">
            <div class="items-header">
              <h2>Jewelry pieces</h2>
              <p>{{ order.items.length }} curated items</p>
            </div>
            <article *ngFor="let item of order.items" class="item-row">
              <div class="avatar">{{ item.productId.slice(0, 2) }}</div>
              <div class="item-details">
                <h3>Product {{ item.productId.slice(0, 8) }}</h3>
                <p>{{ item.quantity }} × {{ item.unitPrice.amount | currency : item.unitPrice.currency }}</p>
              </div>
              <div class="item-price">
                {{ item.unitPrice.amount * item.quantity | currency : item.unitPrice.currency }}
              </div>
            </article>
          </section>
          <section class="support-card">
            <h2>Concierge &amp; support</h2>
            <p>
              Need to adjust shipping, apply a manual refund, or flag QA feedback? Jump into the returns workspace
              without leaving the order.
            </p>
            <div class="support-actions">
              <button class="btn-outline" type="button" (click)="openReturnsWorkspace(order.id)">Open returns console</button>
              <button class="btn-gold" type="button" (click)="contactSupport(order)">Email concierge</button>
            </div>
          </section>
        </div>
      </div>

      <ng-template #loadingState>
        <div class="loading">Loading order details...</div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .order-detail-page {
        padding: 3rem 1.5rem 4rem;
        background: linear-gradient(180deg, #fdfcf9 0%, #f7f4ef 100%);
        min-height: 100vh;
      }

      .order-shell {
        max-width: 1000px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .order-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
      }

      .back-link {
        text-decoration: none;
        color: #b45309;
        font-weight: 600;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.3em;
        font-size: 0.75rem;
        color: #a16207;
        margin: 0.5rem 0 0;
      }

      .order-header h1 {
        margin: 0.3rem 0;
        font-size: 2.4rem;
        color: #1f2937;
      }

      .order-header p {
        margin: 0;
        color: #6b7280;
      }

      .status-pill {
        padding: 0.4rem 1.2rem;
        border-radius: 999px;
        font-weight: 600;
        color: #fff;
        text-transform: capitalize;
      }

      .status-pill[data-status='pendingpayment'] {
        background: #f97316;
      }

      .status-pill[data-status='confirmed'] {
        background: #10b981;
      }

      .status-pill[data-status='cancelled'] {
        background: #ef4444;
      }

      .order-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      section {
        background: #fff;
        border-radius: 24px;
        padding: 1.75rem;
        box-shadow: 0 25px 60px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(212, 175, 55, 0.15);
      }

      .summary-card h2,
      .items-card h2,
      .return-card h2 {
        margin: 0;
        color: #11172b;
      }

      .return-card,
      .items-card,
      .support-card {
        grid-column: span 2;
      }
      .payment-card {
        background: #fff;
        border-radius: 24px;
        padding: 1.75rem;
        box-shadow: 0 25px 60px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(212, 175, 55, 0.15);
      }

      .payment-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        margin: 1rem 0;
      }

      .payment-breakdown div {
        display: flex;
        justify-content: space-between;
        font-weight: 600;
        color: #11172b;
      }

      .payment-breakdown span {
        color: #6b7280;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .payment-breakdown .grand-total {
        border-top: 1px solid #f3f4f6;
        padding-top: 0.75rem;
      }

      .muted {
        color: #6b7280;
        margin: 0;
        font-size: 0.9rem;
      }

      .return-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .btn-gold {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
      .btn-outline {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        border-radius: 999px;
        border: 1px solid #d1d5db;
        background: transparent;
        color: #11172b;
        font-weight: 600;
        cursor: pointer;
      }

      .support-card {
        background: #fff;
        border-radius: 24px;
        padding: 1.75rem;
        box-shadow: 0 25px 60px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(212, 175, 55, 0.15);
      }

      .support-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
      }
        border: none;
        border-radius: 999px;
        background: linear-gradient(120deg, #fcd34d, #f59e0b);
        color: #1f2937;
        font-weight: 600;
        cursor: pointer;
      }

      .alert {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
      }

      .alert.success {
        background: #ecfdf5;
        color: #047857;
      }

      .alert.danger {
        background: #fef2f2;
        color: #b91c1c;
      }

      .alert.muted {
        background: #f3f4f6;
        color: #4b5563;
      }

      .form-error {
        color: #b91c1c;
        font-size: 0.8rem;
      }

      dl {
        margin: 1.25rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      dt {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #9ca3af;
        margin: 0;
      }

      dd {
        margin: 0.25rem 0 0;
        font-size: 1rem;
        color: #1f2937;
        font-weight: 600;
      }

      .timeline {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
      }

      .timeline-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #9ca3af;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .timeline-step .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #d1d5db;
        margin-bottom: 0.35rem;
      }

      .timeline-step.active {
        color: #11172b;
      }

      .timeline-step.active .dot {
        background: #f97316;
      }

      .bar {
        flex: 1;
        height: 2px;
        background: #e5e7eb;
      }

      .bar.active {
        background: #f97316;
      }

      .items-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }

      .items-header p {
        margin: 0;
        color: #6b7280;
      }

      .item-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 0;
        border-bottom: 1px solid #f3f4f6;
      }

      .item-row:last-child {
        border-bottom: none;
      }

      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: #fef3c7;
        color: #b45309;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .item-details h3 {
        margin: 0;
        color: #11172b;
      }

      .item-details p {
        margin: 0;
        color: #6b7280;
      }

      .item-price {
        margin-left: auto;
        font-weight: 700;
        color: #11172b;
      }

      .loading {
        text-align: center;
        padding: 4rem 1rem;
        color: #9ca3af;
      }

      @media (max-width: 900px) {
        .order-grid {
          grid-template-columns: 1fr;
        }

        .order-header {
          flex-direction: column;
        }

        .return-card,
        .items-card,
        .support-card {
          grid-column: span 1;
        }
      }
    `,
  ],
})
export class OrderDetailComponent implements OnInit {
  order$!: Observable<Order | null>;
  readonly returnForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(10)]],
  });
  existingReturn = signal<ReturnRequest | null>(null);
  returnLoading = signal(false);
  returnSuccess = signal<string | null>(null);
  returnError = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orderService: OrderService,
    private readonly returnService: ReturnService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadReturnState(orderId);
      this.order$ = this.orderService.getOrder(orderId).pipe(
        catchError(() => {
          this.router.navigate(['/my-orders']);
          return of(null);
        })
      );
    } else {
      this.router.navigate(['/my-orders']);
    }
  }

  getOrderSubtotal(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.unitPrice.amount * item.quantity, 0);
  }

  openReturnsWorkspace(orderId: string): void {
    this.router.navigate(['/returns'], { queryParams: { orderId } });
  }

  contactSupport(order: Order): void {
    const subject = encodeURIComponent(`Order ${order.id} assistance`);
    const body = encodeURIComponent(
      `Hi Premium Commerce Concierge,%0D%0A%0D%0AOrder ID: ${order.id}%0D%0AStatus: ${order.status}%0D%0APlease help me with ...`
    );
    window.open(`mailto:support@premiumcommerce.io?subject=${subject}&body=${body}`, '_blank');
  }

  submitReturn(orderId: string): void {
    if (this.returnForm.invalid) {
      this.returnForm.markAllAsTouched();
      return;
    }
    this.returnLoading.set(true);
    this.returnService
      .createReturnRequest({
        orderId,
        reason: this.returnForm.controls.reason.value,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (request) => {
          this.existingReturn.set(request);
          this.returnSuccess.set('Return request submitted successfully.');
          this.returnError.set(null);
          this.returnForm.reset();
          this.returnLoading.set(false);
        },
        error: (error) => {
          this.returnError.set(error.error?.detail || 'Unable to submit return request.');
          this.returnSuccess.set(null);
          this.returnLoading.set(false);
        },
      });
  }

  private loadReturnState(orderId: string): void {
    this.returnLoading.set(true);
    this.returnService
      .listReturns(1, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const request = response.items.find((item) => item.orderId === orderId) ?? null;
          this.existingReturn.set(request);
          this.returnLoading.set(false);
        },
        error: () => {
          this.returnLoading.set(false);
        },
      });
  }
}

