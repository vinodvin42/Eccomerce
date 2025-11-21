import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import type { CartItem } from '../../../state/cart/cart.actions';

@Component({
  selector: 'app-cart-items',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe],
  template: `
    <div class="cart-items">
      <article class="cart-item" *ngFor="let item of items">
        <div class="cart-thumb">
          <img *ngIf="item.imageUrl; else initials" [src]="item.imageUrl" [alt]="item.name" />
          <ng-template #initials>{{ item.name.charAt(0) }}</ng-template>
        </div>
        <div class="cart-info">
          <p class="cart-name">{{ item.name }}</p>
          <span
            class="stock"
            [class.stock-warning]="item.inventory !== undefined && item.inventory <= 5 && item.inventory > 0"
            [class.stock-danger]="item.inventory === 0"
          >
            <span *ngIf="item.inventory === undefined || item.inventory > 5">In stock</span>
            <span *ngIf="item.inventory !== undefined && item.inventory <= 5 && item.inventory > 0"
              >Only {{ item.inventory }} left</span
            >
            <span *ngIf="item.inventory === 0">Out of stock</span>
          </span>
          <span class="shipping-badge" *ngIf="item.inventory !== 0">Eligible for FREE Shipping</span>
          <div class="cart-actions">
            <div class="qty-group">
              <button type="button" (click)="updateQuantity.emit({ productId: item.productId, quantity: item.quantity - 1 })" [disabled]="item.quantity <= 1">−</button>
              <span>{{ item.quantity }}</span>
              <button
                type="button"
                (click)="updateQuantity.emit({ productId: item.productId, quantity: item.quantity + 1 })"
                [disabled]="item.inventory !== undefined && item.quantity >= item.inventory"
              >
                +
              </button>
            </div>
            <button type="button" class="remove-item-btn" (click)="removeItem.emit(item.productId)" title="Remove item">
              Remove
            </button>
            <button
              *ngIf="item.priceBreakdown"
              type="button"
              class="toggle-breakdown-btn"
              (click)="toggleBreakdown.emit(item.productId)"
              [attr.aria-expanded]="isBreakdownVisible(item.productId)"
            >
              <span>{{ isBreakdownVisible(item.productId) ? 'Hide' : 'Show' }} Price Calculation</span>
              <span class="toggle-icon">{{ isBreakdownVisible(item.productId) ? '▼' : '▶' }}</span>
            </button>
          </div>
          <div class="breakdown-toggle-section" *ngIf="item.priceBreakdown">
            <div class="item-price-breakdown" *ngIf="isBreakdownVisible(item.productId)">
              <div class="breakdown-header">
                <strong>Price Breakdown (per unit):</strong>
              </div>
              <div class="breakdown-row" *ngIf="item.priceBreakdown.metalValue > 0">
                <span class="breakdown-label">Metal Value:</span>
                <span class="breakdown-value">{{ item.priceBreakdown.metalValue | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
              </div>
              <div class="breakdown-row" *ngIf="item.priceBreakdown.wastageValue > 0">
                <span class="breakdown-label">Wastage Value:</span>
                <span class="breakdown-value">{{ item.priceBreakdown.wastageValue | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
              </div>
              <div class="breakdown-row" *ngIf="item.priceBreakdown.makingCharges > 0">
                <span class="breakdown-label">Making Charges:</span>
                <span class="breakdown-value">{{ item.priceBreakdown.makingCharges | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
              </div>
              <div class="breakdown-row" *ngIf="item.priceBreakdown.stoneCharges > 0">
                <span class="breakdown-label">Stone Charges:</span>
                <span class="breakdown-value">{{ item.priceBreakdown.stoneCharges | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
              </div>
              <div class="breakdown-row" *ngIf="item.priceBreakdown.otherCharges > 0">
                <span class="breakdown-label">Other Charges:</span>
                <span class="breakdown-value">{{ item.priceBreakdown.otherCharges | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
              </div>
              <div class="breakdown-row breakdown-total">
                <span class="breakdown-label"><strong>Total (per unit):</strong></span>
                <span class="breakdown-value"><strong>{{ item.price.amount | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }}</strong></span>
              </div>
              <div class="breakdown-row breakdown-total" *ngIf="item.quantity > 1">
                <span class="breakdown-label"><strong>Total ({{ item.quantity }} units):</strong></span>
                <span class="breakdown-value"><strong>{{ item.price.amount * item.quantity | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }}</strong></span>
              </div>
            </div>
          </div>
        </div>
        <div class="cart-price">
          <strong>{{ item.price.amount * item.quantity | currency : (item.price.currency || 'INR') }}</strong>
        </div>
      </article>
    </div>
  `,
  styles: [
    `
      .cart-items {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .cart-item {
        display: flex;
        gap: 1rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--premium-silver);
      }

      .cart-item:last-child {
        border-bottom: none;
      }

      .cart-thumb {
        width: 120px;
        height: 120px;
        border-radius: 0.75rem;
        overflow: hidden;
        background: var(--premium-moonstone);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .cart-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cart-thumb:has(ng-template) {
        font-size: 2rem;
        font-weight: 700;
        color: var(--premium-rose-gold);
      }

      .cart-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .cart-name {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--premium-onyx);
      }

      .stock {
        font-size: 0.875rem;
        color: #10b981;
      }

      .stock.stock-warning {
        color: #f59e0b;
      }

      .stock.stock-danger {
        color: #ef4444;
      }

      .shipping-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .cart-actions {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }

      .qty-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        padding: 0.25rem;
      }

      .qty-group button {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--premium-onyx);
        font-size: 1.25rem;
        cursor: pointer;
        border-radius: 0.25rem;
        transition: background 0.2s;
      }

      .qty-group button:hover:not(:disabled) {
        background: var(--premium-moonstone);
      }

      .qty-group button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .qty-group span {
        min-width: 40px;
        text-align: center;
        font-weight: 600;
      }

      .remove-item-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--premium-silver);
        background: transparent;
        color: var(--premium-rose-gold);
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .remove-item-btn:hover {
        background: rgba(183, 110, 121, 0.1);
        border-color: var(--premium-rose-gold);
      }

      .toggle-breakdown-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--premium-silver);
        background: transparent;
        color: var(--premium-onyx);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
      }

      .toggle-breakdown-btn:hover {
        background: var(--premium-moonstone);
      }

      .toggle-icon {
        font-size: 0.75rem;
      }

      .breakdown-toggle-section {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--premium-silver);
      }

      .item-price-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: var(--premium-moonstone);
        border-radius: 0.5rem;
      }

      .breakdown-header {
        margin-bottom: 0.5rem;
        color: var(--premium-onyx);
      }

      .breakdown-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
      }

      .breakdown-row.breakdown-total {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid var(--premium-silver);
      }

      .breakdown-label {
        color: var(--premium-titanium);
      }

      .breakdown-value {
        color: var(--premium-onyx);
        font-weight: 600;
      }

      .cart-price {
        min-width: 120px;
        text-align: right;
        font-size: 1.125rem;
        color: var(--premium-onyx);
      }

      @media (max-width: 768px) {
        .cart-item {
          flex-direction: column;
        }

        .cart-price {
          text-align: left;
        }
      }
    `,
  ],
})
export class CartItemsComponent {
  @Input() items: CartItem[] = [];
  @Input() visibleBreakdowns: Set<string> = new Set();
  @Output() updateQuantity = new EventEmitter<{ productId: string; quantity: number }>();
  @Output() removeItem = new EventEmitter<string>();
  @Output() toggleBreakdown = new EventEmitter<string>();

  isBreakdownVisible(productId: string): boolean {
    return this.visibleBreakdowns.has(productId);
  }
}

