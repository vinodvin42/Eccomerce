import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { CartActions } from '../../state/cart/cart.actions';
import { selectCartItems, selectCartTotal } from '../../state/cart/cart.selectors';
import type { AppState } from '../../state';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, RouterLink],
  template: `
    <div class="page-container-narrow">
      <ng-container *ngIf="(cartItems$ | async) as items">
        <header *ngIf="items.length > 0" class="cart-heading">
          <div>
            <h1>Shopping Cart</h1>
            <p>Review your items before checkout.</p>
          </div>
          <a routerLink="/store" class="link-soft">← Continue Shopping</a>
        </header>

        <div *ngIf="items.length === 0" class="empty-state">
          <div class="empty-icon">👜</div>
          <h3>Your bag is empty</h3>
          <p>Add items to your cart to get started.</p>
          <a routerLink="/store" class="btn-primary">Discover Jewelry</a>
        </div>

        <div *ngIf="items.length > 0" class="cart-grid">
          <div class="cart-main">
            <section class="cart-card">
              <div class="cart-items">
                <article class="cart-item" *ngFor="let item of items">
                  <div class="cart-thumb">
                    <img *ngIf="item.imageUrl; else initials" [src]="item.imageUrl" [alt]="item.name" />
                    <ng-template #initials>{{ item.name.charAt(0) }}</ng-template>
                  </div>
                  <div class="cart-info">
                    <p class="cart-name">{{ item.name }}</p>
                    <span class="stock">In stock</span>
                    <div class="cart-actions">
                      <div class="qty-group">
                        <button type="button" (click)="updateQuantity(item.productId, item.quantity - 1)" [disabled]="item.quantity <= 1">−</button>
                        <span>{{ item.quantity }}</span>
                        <button type="button" (click)="updateQuantity(item.productId, item.quantity + 1)">+</button>
                      </div>
                      <button class="link" type="button" (click)="removeItem(item.productId)">Remove</button>
                    </div>
                  </div>
                  <div class="cart-price">
                    {{ item.price.amount * item.quantity | currency : item.price.currency }}
                  </div>
                </article>
              </div>
              <div class="cart-subtotal">
                Subtotal ({{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}):
                <strong>{{ cartTotal$ | async | currency : 'INR' : 'symbol' : '1.2-2' }}</strong>
              </div>
            </section>
          </div>

          <aside class="summary-panel">
            <div class="summary-card">
              <div class="summary-total-line">
                <span>Subtotal ({{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}):</span>
                <strong>{{ cartTotal$ | async | currency : 'INR' : 'symbol' : '1.2-2' }}</strong>
              </div>

              <a routerLink="/checkout" class="btn-primary proceed">
                Proceed to Checkout
              </a>

              <p class="summary-note">Secure checkout • 60-day returns • Lifetime support</p>
            </div>
          </aside>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cart-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--premium-silver);
        margin-bottom: 1.5rem;
      }
      .cart-heading h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 500;
        color: var(--premium-onyx);
      }
      .cart-heading p {
        margin: 0.3rem 0 0;
        color: var(--premium-titanium);
        font-size: 0.95rem;
      }
      .link-soft {
        color: var(--premium-rose-gold);
        text-decoration: none;
        font-weight: 600;
      }
      .cart-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 1.5rem;
      }
      .cart-main {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .cart-items {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .cart-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 1rem;
        padding-bottom: 1.25rem;
        border-bottom: 1px solid #e3e6e6;
      }
      .cart-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .cart-thumb {
        width: 120px;
        height: 120px;
        border: 1px solid #e3e6e6;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        background: #fafafa;
        color: #aeb1b5;
        overflow: hidden;
      }
      .cart-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .cart-info {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .cart-name {
        margin: 0;
        font-size: 1rem;
        color: #0f1111;
        font-weight: 500;
      }
      .stock {
        color: #067d62;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .cart-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }
      .qty-group {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d5d9d9;
        border-radius: 24px;
        overflow: hidden;
      }
      .qty-group button {
        background: #f0f2f2;
        border: none;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
      }
      .qty-group button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .qty-group span {
        padding: 0 0.75rem;
        font-weight: 600;
        min-width: 40px;
        text-align: center;
      }
      .cart-actions .link {
        background: none;
        border: none;
        color: #007185;
        font-weight: 500;
        cursor: pointer;
        font-size: 0.9rem;
      }
      .cart-actions .link:hover {
        text-decoration: underline;
      }
      .cart-price {
        font-weight: 700;
        font-size: 1.1rem;
        color: #0f1111;
      }
      .cart-subtotal {
        padding-top: 1.25rem;
        border-top: 1px solid #e3e6e6;
        text-align: right;
        font-size: 1rem;
      }
      .summary-panel {
        position: sticky;
        top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: fit-content;
      }
      .summary-total-line {
        display: flex;
        justify-content: space-between;
        font-size: 1rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--premium-silver);
      }
      .proceed {
        width: 100%;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        margin-top: 0.5rem;
      }
      .summary-note {
        margin: 1rem 0 0;
        font-size: 0.85rem;
        color: var(--premium-titanium);
        text-align: center;
      }
      @media (max-width: 960px) {
        .cart-grid {
          grid-template-columns: 1fr;
        }
        .cart-item {
          grid-template-columns: auto 1fr;
        }
        .cart-price {
          justify-self: flex-start;
          margin-top: 0.5rem;
        }
      }
    `,
  ],
})
export class CartComponent {
  cartItems$ = this.store.select(selectCartItems);
  cartTotal$ = this.store.select(selectCartTotal);
  tenantBrand$ = this.brandingService.tenantBrandChanges$;

  constructor(
    private readonly store: Store<AppState>,
    private readonly brandingService: BrandingService
  ) {}

  updateQuantity(productId: string, quantity: number): void {
    if (quantity > 0) {
      this.store.dispatch(CartActions.updateQuantity({ productId, quantity }));
    } else {
      this.store.dispatch(CartActions.removeItem({ productId }));
    }
  }

  removeItem(productId: string): void {
    this.store.dispatch(CartActions.removeItem({ productId }));
  }
}

