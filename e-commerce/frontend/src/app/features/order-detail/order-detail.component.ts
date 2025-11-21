import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';

import { OrderService } from '../../core/services/order.service';
import type { Order } from '../../shared/models/order';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, CurrencyPipe, DatePipe, TitleCasePipe, RouterLink],
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
        grid-template-columns: 340px 1fr;
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
      .items-card h2 {
        margin: 0;
        color: #11172b;
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
      }
    `,
  ],
})
export class OrderDetailComponent implements OnInit {
  order$!: Observable<Order | null>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orderService: OrderService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
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
}

