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
          <div class="order-card__line"></div>
          <header>
            <div>
              <h3>Order #{{ order.id.slice(0, 8) }}</h3>
              <p>Placed on {{ order.audit.createdDate | date : 'mediumDate' }}</p>
            </div>
            <span class="status-pill" [attr.data-status]="order.status.toLowerCase()">
              {{ order.status | titlecase }}
            </span>
          </header>

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

          <div class="items-list">
            <div *ngFor="let item of order.items">
              <span class="badge">{{ item.quantity }}×</span>
              <span class="item-label">Product {{ item.productId.slice(0, 6) }}</span>
              <span class="item-price">
                {{ item.unitPrice.amount * item.quantity | currency : item.unitPrice.currency }}
              </span>
            </div>
          </div>

          <footer>
            <div class="timeline">
              <span class="dot active"></span>
              <span class="bar" [class.active]="true"></span>
              <span class="dot" [class.active]="order.status !== 'PendingPayment'"></span>
              <span class="bar" [class.active]="order.status === 'Confirmed'"></span>
              <span class="dot" [class.active]="order.status === 'Confirmed'"></span>
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
        max-width: 900px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .order-card {
        background: #fff;
        border-radius: 24px;
        padding: 1.75rem;
        position: relative;
        box-shadow: 0 30px 70px var(--premium-shadow);
        border: 1px solid rgba(215, 220, 226, 0.6);
      }

      .order-card__line {
        position: absolute;
        left: 0;
        top: 30px;
        bottom: 30px;
        width: 4px;
        border-radius: 999px;
        background: linear-gradient(180deg, var(--premium-gold), var(--premium-rose-gold));
      }

      .order-card header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-left: 1rem;
      }

      .order-card header h3 {
        margin: 0;
        color: #11172b;
      }

      .order-card header p {
        margin: 0.25rem 0 0;
        color: var(--premium-titanium);
        font-size: 0.9rem;
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

      .order-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
        padding: 1rem 1rem 0;
      }

      .order-stats div {
        background: var(--premium-moonstone);
        border-radius: 16px;
        padding: 0.9rem;
        text-align: center;
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

      .items-list {
        padding: 1rem 1rem 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .items-list div {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.75rem;
        align-items: center;
        color: var(--premium-stone);
      }

      .badge {
        padding: 0.25rem 0.7rem;
        border-radius: 999px;
        background: var(--premium-moonstone);
        font-weight: 600;
      }

      .item-price {
        font-weight: 600;
        color: #11172b;
      }

      footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1rem 0;
      }

      .timeline {
        display: flex;
        align-items: center;
        gap: 0.3rem;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #d1d5db;
      }

      .dot.active {
        background: #f97316;
      }

      .bar {
        width: 30px;
        height: 2px;
        background: #d1d5db;
      }

      .bar.active {
        background: #f97316;
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
        .order-stats {
          grid-template-columns: 1fr;
        }

        .orders-hero {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class OrderHistoryComponent implements OnInit {
  orders$: Observable<Order[]>;
  loading$: Observable<boolean>;
  tenantBrand$ = this.brandingService.tenantBrandChanges$;

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
}

