import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { OrdersActions } from '../../state/orders/orders.actions';
import { selectOrdersList, selectOrdersLoading } from '../../state/orders/orders.selectors';
import type { AppState } from '../../state';
import type { Order } from '../../shared/models/order';
import { BrandingService } from '../../core/services/branding.service';

type StageKey = 'placed' | 'confirmed' | 'packed' | 'shipped';
interface StageDescriptor {
  key: StageKey;
  label: string;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, TitleCasePipe, RouterLink],
  template: `
    <div class="orders-page">
      <section class="orders-hero">
        <div>
          <p class="eyebrow">Order timeline</p>
          <h1>Keep shining, track every journey</h1>
        <p>All your {{ (tenantBrand$ | async) ?? 'Premium Jewelry' }} orders with live fulfillment states.</p>
        </div>
        <a routerLink="/store" class="link-soft">← Continue shopping</a>
      </section>

      <div *ngIf="loading$ | async" class="loading">Loading orders...</div>

      <div *ngIf="!(loading$ | async)" class="orders-board">
        <article *ngFor="let order of orders$ | async" class="order-card">
          <header class="order-card__header">
            <div>
              <p class="order-number">Order #{{ order.id.slice(0, 8) }}</p>
              <p class="order-date">Placed on {{ order.audit.createdDate | date : 'mediumDate' }}</p>
            </div>
            <span class="status-pill" [attr.data-status]="order.status.toLowerCase()">
              {{ order.status | titlecase }}
            </span>
          </header>

          <div class="order-timeline">
            <ng-container *ngFor="let stage of stageFlow; trackBy: trackStage; let i = index">
              <div class="timeline-step" [class.active]="isStageActive(order, stage.key)">
                <div class="dot"></div>
                <span>{{ stage.label }}</span>
              </div>
              <div
                *ngIf="i < stageFlow.length - 1"
                class="timeline-bar"
                [class.active]="isStageActive(order, stageFlow[i + 1].key)"
              ></div>
            </ng-container>
          </div>

          <dl class="order-stats">
            <div>
              <dt>Total</dt>
              <dd>{{ order.total.amount | currency : order.total.currency }}</dd>
            </div>
            <div>
              <dt>Items</dt>
              <dd>{{ order.items.length }}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{{ order.shippingAddress || 'At checkout' }}</dd>
            </div>
          </dl>

          <div class="product-callout" *ngIf="primaryItem(order) as item">
            <div class="product-thumb">
              <span>{{ getProductAvatar(item.productId) }}</span>
            </div>
            <div class="product-meta">
              <p class="product-title">Product {{ item.productId.slice(0, 6) }}</p>
              <p class="product-status">
                {{ order.status === 'Confirmed' ? 'Delivered' : 'Processing' }}
              </p>
            </div>
            <div class="product-total">
              {{ item.unitPrice.amount * item.quantity | currency : item.unitPrice.currency }}
            </div>
          </div>

          <footer class="order-card__footer">
            <div class="footer-info">
              <span class="footer-label">Shipping</span>
              <strong>{{ order.shippingAddress || 'Captured at checkout' }}</strong>
            </div>
            <a [routerLink]="['/orders', order.id]" class="btn-details">View details</a>
          </footer>
        </article>
      </div>

      <div *ngIf="(orders$ | async)?.length === 0 && !(loading$ | async)" class="empty-state">
        <div class="empty-icon">📦</div>
        <h2>No orders yet</h2>
        <p>Add something beautiful to your cart and we’ll meet you here.</p>
        <a routerLink="/store" class="btn-primary">Browse Collections</a>
      </div>
    </div>
  `,
  styles: [
    `
      .orders-page {
        padding: 3rem 1.5rem 4rem;
        background: linear-gradient(180deg, var(--premium-pearl) 0%, var(--premium-moonstone) 100%);
        min-height: 100vh;
      }

      .orders-hero {
        max-width: 900px;
        margin: 0 auto 2rem;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.3em;
        font-size: 0.75rem;
        color: var(--premium-rose-gold);
        margin: 0;
      }

      .orders-hero h1 {
        margin: 0.35rem 0;
        font-size: 2.4rem;
        color: #1f2937;
      }

      .orders-hero p {
        margin: 0;
        color: var(--premium-titanium);
      }

      .link-soft {
        color: var(--premium-rose-gold);
        text-decoration: none;
        font-weight: 600;
      }

      .loading {
        text-align: center;
        padding: 3rem;
        color: #94a3af;
      }

      .orders-board {
        max-width: 960px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .order-card {
        background: #fff;
        border-radius: 32px;
        padding: 2rem;
        box-shadow: 0 40px 80px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(215, 220, 226, 0.6);
      }

      .order-card__header {
        display: flex;
        justify-content: space-between;
        gap: 1.5rem;
      }

      .order-number {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #0f172a;
      }

      .order-date {
        margin: 0.25rem 0 0;
        color: var(--premium-titanium);
      }

      .status-pill {
        align-self: flex-start;
        padding: 0.4rem 1rem;
        border-radius: 999px;
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: capitalize;
      }

      .status-pill[data-status='pendingpayment'] {
        background: rgba(212, 175, 55, 0.15);
        color: var(--premium-gold);
      }

      .status-pill[data-status='confirmed'] {
        background: rgba(105, 187, 152, 0.2);
        color: #0f5132;
      }

      .status-pill[data-status='cancelled'] {
        background: rgba(183, 110, 121, 0.15);
        color: var(--premium-rose-gold);
      }

      .order-timeline {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 1.5rem 0 1rem;
      }

      .timeline-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #cbd5f5;
      }

      .timeline-step .dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid #cbd5f5;
        margin-bottom: 0.4rem;
      }

      .timeline-step.active {
        color: #f97316;
      }

      .timeline-step.active .dot {
        border-color: #f97316;
        background: #f97316;
      }

      .timeline-bar {
        flex: 1;
        height: 2px;
        background: #e2e8f0;
      }

      .timeline-bar.active {
        background: linear-gradient(90deg, #fcd34d, #f97316);
      }

      .order-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        padding: 0;
        margin-bottom: 1.5rem;
      }

      .order-stats div {
        background: #f7f4ef;
        border-radius: 18px;
        padding: 1rem;
        text-align: left;
      }

      dt {
        margin: 0;
        font-size: 0.75rem;
        color: var(--premium-stone);
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      dd {
        margin: 0.35rem 0 0;
        color: var(--premium-onyx);
        font-weight: 700;
        font-size: 1rem;
      }

      .product-callout {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem;
        border-radius: 1.5rem;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: rgba(252, 211, 77, 0.08);
        margin-bottom: 1.25rem;
      }

      .product-thumb {
        width: 64px;
        height: 64px;
        border-radius: 20px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 1.2rem;
      }

      .product-title {
        margin: 0;
        font-weight: 600;
        color: #11172b;
      }

      .product-status {
        margin: 0.25rem 0 0;
        color: #6b7280;
        font-size: 0.9rem;
      }

      .product-total {
        font-weight: 700;
        color: #11172b;
      }

      .order-card__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .footer-info {
        display: flex;
        flex-direction: column;
      }

      .footer-label {
        color: #94a3b8;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .btn-details {
        padding: 0.7rem 1.5rem;
        border-radius: 999px;
        border: 1px solid var(--premium-rose-gold);
        color: var(--premium-rose-gold);
        text-decoration: none;
        font-weight: 600;
      }

      .empty-state {
        max-width: 520px;
        margin: 3rem auto;
        background: #fff;
        border-radius: 24px;
        padding: 3rem 2rem;
        text-align: center;
        box-shadow: 0 25px 60px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }

      .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .btn-primary {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.9rem 2.2rem;
        border-radius: 999px;
        text-decoration: none;
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        font-weight: 700;
      }

      @media (max-width: 768px) {
        .orders-hero {
          flex-direction: column;
        }

        .order-card__footer {
          flex-direction: column;
          align-items: flex-start;
        }

        .product-callout {
          grid-template-columns: 1fr;
          text-align: left;
        }
      }
    `,
  ],
})
export class OrderHistoryComponent implements OnInit {
  orders$: Observable<Order[]>;
  loading$: Observable<boolean>;
  tenantBrand$ = this.brandingService.tenantBrandChanges$;
  readonly stageFlow: StageDescriptor[] = [
    { key: 'placed', label: 'Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
  ];

  constructor(
    private readonly store: Store<AppState>,
    private readonly brandingService: BrandingService
  ) {
    this.orders$ = this.store.select(selectOrdersList);
    this.loading$ = this.store.select(selectOrdersLoading);
  }

  ngOnInit(): void {
    // Load customer's orders - will use authenticated user's ID from backend
    this.store.dispatch(OrdersActions.loadOrders({ customerId: undefined }));
  }

  trackStage(_: number, stage: StageDescriptor): StageKey {
    return stage.key;
  }

  isStageActive(order: Order, stage: StageKey): boolean {
    if (order.status === 'Cancelled') {
      return stage === 'placed';
    }
    switch (stage) {
      case 'placed':
        return true;
      case 'confirmed':
        return order.status !== 'PendingPayment';
      case 'packed':
      case 'shipped':
        return order.status === 'Confirmed';
      default:
        return false;
    }
  }

  primaryItem(order: Order) {
    return order.items[0] ?? null;
  }

  getProductAvatar(productId: string): string {
    return productId.slice(0, 2).toUpperCase();
  }
}

