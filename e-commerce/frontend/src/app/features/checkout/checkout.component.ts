import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, combineLatest, map, of, startWith, take } from 'rxjs';

import { CartActions } from '../../state/cart/cart.actions';
import { selectCartItems, selectCartTotal } from '../../state/cart/cart.selectors';
import { OrdersActions } from '../../state/orders/orders.actions';
import type { AppState } from '../../state';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { DiscountService } from '../../core/services/discount.service';
import { PaymentService } from '../../core/services/payment.service';
import { ShippingMethodService } from '../../core/services/shipping-method.service';
import type { ShippingMethod } from '../../shared/models/shipping-method';
import { BrandingService } from '../../core/services/branding.service';
import type { PaymentMethod } from '../../shared/models/payment-method';
import type { ApplyDiscountResponse } from '../../shared/models/discount';
import { CatalogService } from '../../core/services/catalog.service';
import { calculateProductPrice } from '../../core/utils/price-calculator';
import type { Product } from '../../shared/models/catalog';
import { CartItemsComponent } from '../../shared/components/cart-items/cart-items.component';
import { CheckoutSummaryComponent, type SummaryItem } from '../../shared/components/checkout-summary/checkout-summary.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, ReactiveFormsModule, FormsModule, RouterLink, CartItemsComponent, CheckoutSummaryComponent],
  template: `
    <div class="page-container-narrow">
      <ng-container *ngIf="cartItems$ | async as cart">
        <header *ngIf="cart.length > 0" class="checkout-heading">
          <div>
            <h1>Shopping Cart</h1>
            <p>Items reserved for the next 30 minutes.</p>
          </div>
          <span class="price-label">Price</span>
        </header>

        <div *ngIf="cart.length === 0" class="empty-state">
          <div class="empty-icon">👜</div>
          <h3>Your bag is empty</h3>
          <p>Add a jewel to begin checkout.</p>
          <a routerLink="/store" class="btn-primary">Discover Jewelry</a>
        </div>

        <div *ngIf="cart.length > 0" class="checkout-grid">
          <div class="checkout-main">
            <section class="cart-card">
              <app-cart-items
                [items]="cart"
                [visibleBreakdowns]="visibleBreakdowns()"
                (updateQuantity)="updateQuantity($event.productId, $event.quantity)"
                (removeItem)="removeItem($event)"
                (toggleBreakdown)="toggleItemBreakdown($event)"
              ></app-cart-items>
              <div class="cart-subtotal">
                Subtotal ({{ cart.length }} {{ cart.length === 1 ? 'item' : 'items' }}):
                <strong>{{ cartTotal$ | async | currency : 'INR' : 'symbol' : '1.2-2' }}</strong>
              </div>
            </section>

            <form
              id="checkoutForm"
              class="details-form"
              [formGroup]="checkoutForm"
              (ngSubmit)="placeOrder()"
            >
              <section class="form-card">
                <div class="card-header">
                  <h2>Shipping Address</h2>
                  <p>We ship insured and track every delivery.</p>
                </div>
                <div class="grid-two">
                  <label>
                    Full Name
                    <input formControlName="fullName" type="text" placeholder="Recipient full name" required />
                  </label>
                  <label>
                    Email
                    <input formControlName="email" type="email" placeholder="you@example.com" required />
                  </label>
                </div>
                <div class="grid-two">
                  <label>
                    Phone
                    <input formControlName="phone" type="tel" placeholder="+1 (555) 000-0000" required />
                  </label>
                  <label>
                    City
                    <input formControlName="city" type="text" placeholder="City" required />
                  </label>
                </div>
                <label>
                  Address
                  <textarea formControlName="address" rows="3" placeholder="Street, apartment, building" required></textarea>
                </label>
                <div class="grid-two">
                  <label>
                    State / Province
                    <input formControlName="state" type="text" required />
                  </label>
                  <label>
                    ZIP / Postal Code
                    <input formControlName="zipCode" type="text" required />
                  </label>
                </div>
              </section>

              <!-- Shipping and Payment Method Selection Row -->
              <section class="form-card">
                <div class="card-header">
                  <h2>Shipping & Payment</h2>
                  <p>Select your shipping and payment options.</p>
                </div>
                <div class="method-selection-grid">
                  <!-- Shipping Method Dropdown -->
                  <div class="method-select-group">
                    <label>
                      <span>Shipping Method *</span>
                      <select
                        [value]="selectedShippingMethod()?.id || ''"
                        (change)="onShippingMethodChange($event)"
                        [disabled]="shippingMethods().length === 0"
                      >
                        <option value="" disabled>Select shipping method</option>
                        <option *ngFor="let method of shippingMethods()" [value]="method.id">
                          {{ method.name }} - {{ method.baseCost.amount | currency : method.baseCost.currency }}
                          <span *ngIf="method.isExpress"> (Express)</span>
                        </option>
                      </select>
                      <small *ngIf="selectedShippingMethod()" class="method-details">
                        {{ selectedShippingMethod()?.description || ((selectedShippingMethod()?.estimatedDaysMin || 3) + '-' + (selectedShippingMethod()?.estimatedDaysMax || 7) + ' business days') }}
                      </small>
                    </label>
                  </div>

                  <!-- Payment Method Dropdown -->
                  <div class="method-select-group">
                    <label>
                      <span>Payment Method *</span>
                      <select
                        [value]="selectedPaymentMethod()?.id || ''"
                        (change)="onPaymentMethodChange($event)"
                        [disabled]="paymentMethods().length === 0"
                      >
                        <option value="" disabled>Select payment method</option>
                        <option *ngFor="let method of paymentMethods()" [value]="method.id">
                          {{ method.name }}
                        </option>
                      </select>
                      <small *ngIf="selectedPaymentMethod()" class="method-details">
                        {{ selectedPaymentMethod()?.description || getPaymentMethodDescription(selectedPaymentMethod()?.type || '') }}
                      </small>
                    </label>
                  </div>
                </div>
                <div *ngIf="shippingMethods().length === 0" class="alert-error">
                  No shipping methods available. Free shipping will be applied.
                </div>
                <div *ngIf="paymentMethods().length === 0" class="alert-error">
                  No payment methods available. Please contact support before placing an order.
                </div>
              </section>

              <!-- Payment Collection Details Row -->
              <section *ngIf="selectedPaymentMethod()" class="form-card payment-details-card">
                <div class="card-header">
                  <h2>Payment Details</h2>
                  <p>Enter your payment information for {{ selectedPaymentMethod()?.name }}.</p>
                </div>

                <!-- Credit/Debit Card Details -->
                <div *ngIf="selectedPaymentMethod()?.type === 'CreditCard' || selectedPaymentMethod()?.type === 'DebitCard'" class="payment-details-form">
                  <div class="grid-two">
                    <label>
                      <span>Card Number *</span>
                      <input
                        type="text"
                        formControlName="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        maxlength="19"
                        (input)="formatCardNumber($event)"
                      />
                    </label>
                    <label>
                      <span>Cardholder Name *</span>
                      <input
                        type="text"
                        formControlName="cardholderName"
                        placeholder="John Doe"
                      />
                    </label>
                  </div>
                  <div class="grid-two">
                    <label>
                      <span>Expiry Date *</span>
                      <input
                        type="text"
                        formControlName="expiryDate"
                        placeholder="MM/YY"
                        maxlength="5"
                        (input)="formatExpiryDate($event)"
                      />
                    </label>
                    <label>
                      <span>CVV *</span>
                      <input
                        type="text"
                        formControlName="cvv"
                        placeholder="123"
                        maxlength="4"
                        (input)="formatCVV($event)"
                      />
                    </label>
                  </div>
                </div>

                <!-- PayPal Details -->
                <div *ngIf="selectedPaymentMethod()?.type === 'PayPal'" class="payment-details-form">
                  <div class="grid-two">
                    <label>
                      <span>PayPal Email *</span>
                      <input
                        type="email"
                        formControlName="paypalEmail"
                        placeholder="your.email@example.com"
                      />
                    </label>
                  </div>
                  <div class="alert-info">
                    <p>You will be redirected to PayPal to complete your payment.</p>
                  </div>
                </div>

                <!-- Bank Transfer Details -->
                <div *ngIf="selectedPaymentMethod()?.type === 'BankTransfer'" class="payment-details-form">
                  <div class="grid-two">
                    <label>
                      <span>Account Number *</span>
                      <input
                        type="text"
                        formControlName="accountNumber"
                        placeholder="Enter account number"
                      />
                    </label>
                    <label>
                      <span>Bank Name *</span>
                      <input
                        type="text"
                        formControlName="bankName"
                        placeholder="Enter bank name"
                      />
                    </label>
                  </div>
                  <div class="grid-two">
                    <label>
                      <span>Routing Number *</span>
                      <input
                        type="text"
                        formControlName="routingNumber"
                        placeholder="Enter routing number"
                      />
                    </label>
                    <label>
                      <span>Account Holder Name *</span>
                      <input
                        type="text"
                        formControlName="accountHolderName"
                        placeholder="Enter account holder name"
                      />
                    </label>
                  </div>
                  <div class="alert-info">
                    <p>Please transfer the amount to the account details provided in your order confirmation email.</p>
                  </div>
                </div>

                <!-- Digital Wallet Details -->
                <div *ngIf="selectedPaymentMethod()?.type === 'DigitalWallet'" class="payment-details-form">
                  <div class="grid-two">
                    <label>
                      <span>Wallet ID / Phone Number *</span>
                      <input
                        type="text"
                        formControlName="walletId"
                        placeholder="Enter wallet ID or phone number"
                      />
                    </label>
                  </div>
                </div>

                <!-- Cash on Delivery - No Details Needed -->
                <div *ngIf="selectedPaymentMethod()?.type === 'CashOnDelivery'" class="payment-details-form">
                  <div class="alert-info">
                    <p>No payment details required. Payment will be collected in cash when your order is delivered.</p>
                  </div>
                </div>

                <!-- Other Payment Method -->
                <div *ngIf="selectedPaymentMethod()?.type === 'Other'" class="payment-details-form">
                  <div class="grid-two">
                    <label>
                      <span>Payment Reference *</span>
                      <input
                        type="text"
                        formControlName="paymentReference"
                        placeholder="Enter payment reference or transaction ID"
                      />
                    </label>
                    <label>
                      <span>Additional Notes</span>
                      <input
                        type="text"
                        formControlName="paymentNotes"
                        placeholder="Any additional payment information"
                      />
                    </label>
                  </div>
                </div>
              </section>

              <div *ngIf="errorMessage()" class="alert-error form-error">
                {{ errorMessage() }}
              </div>
            </form>
          </div>

          <aside class="summary-panel">
            <div class="summary-card">
              <!-- Discount Code Section -->
              <div class="summary-discount-section">
                <div class="summary-discount-header">
                  <strong>Discount Code</strong>
                </div>
                <div class="summary-discount-input-group">
                  <input
                    type="text"
                    placeholder="Enter discount code"
                    [(ngModel)]="discountCode"
                    [ngModelOptions]="{ standalone: true }"
                    (keyup.enter)="applyDiscountCode()"
                    [disabled]="applyingDiscount() || !!appliedDiscount()"
                  />
                  <button 
                    type="button" 
                    class="btn-discount-apply" 
                    (click)="applyDiscountCode()" 
                    [disabled]="applyingDiscount() || !!appliedDiscount()"
                  >
                    {{ applyingDiscount() ? 'Applying...' : (appliedDiscount() ? 'Applied' : 'Apply') }}
                  </button>
                </div>
                <div *ngIf="discountError()" class="summary-discount-error">
                  {{ discountError() }}
                </div>
                <div *ngIf="appliedDiscount()" class="summary-discount-success">
                  <span>✓ {{ appliedDiscount()?.discount.name }} applied</span>
                  <button type="button" class="link" (click)="removeDiscount()">Remove</button>
                </div>
              </div>

              <app-checkout-summary
                [items]="getSummaryItems(cart)"
                [discountCode]="appliedDiscount()?.discount.code"
                [note]="'Items reserved for the next 30 minutes.'"
                [total]="(finalTotal$ | async) || 0"
                [totalCurrency]="'INR'"
              ></app-checkout-summary>

              <button
                class="btn-primary proceed"
                type="submit"
                form="checkoutForm"
                [disabled]="checkoutForm.invalid || submitting() || !selectedPaymentMethod()"
              >
                {{ submitting() ? 'Processing...' : 'Proceed to Buy' }}
              </button>
            </div>

            <div class="mini-card">
              <h3>{{ (tenantBrand$ | async) ?? 'Premium Jewelry' }} Assurance</h3>
              <ul>
                <li>Authenticity certificate + lifetime care</li>
                <li>Free resizing within 60 days</li>
                <li>Dedicated concierge (24/7)</li>
              </ul>
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
      .checkout-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--premium-silver);
        margin-bottom: 1.5rem;
      }
      .checkout-heading h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 500;
        color: var(--premium-onyx);
      }
      .checkout-heading p {
        margin: 0.3rem 0 0;
        color: var(--premium-titanium);
        font-size: 0.95rem;
      }
      .price-label {
        font-size: 0.85rem;
        color: var(--premium-stone);
      }
      .checkout-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 1.5rem;
      }
      .checkout-main {
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
        gap: 0.5rem;
        flex: 1;
      }
      .cart-name {
        margin: 0;
        font-size: 1.125rem;
        color: #0f1111;
        font-weight: 600;
        line-height: 1.4;
      }
      .stock {
        color: #067d62;
        font-weight: 600;
        font-size: 0.875rem;
        display: inline-block;
        margin-right: 0.75rem;
      }
      .shipping-badge {
        font-size: 0.875rem;
        color: #565959;
        display: inline-block;
      }
      .breakdown-toggle-section {
        display: flex;
        flex-direction: column;
        margin-top: 0.75rem;
      }
      .toggle-breakdown-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.85rem;
        background: #f8f9fa;
        border: 1px solid #d5d9d9;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: #0f1111;
        transition: all 0.2s ease;
        gap: 0.5rem;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .toggle-breakdown-btn:hover {
        background: #e9ecef;
        border-color: #c45500;
      }
      .toggle-breakdown-btn span:first-child {
        text-align: left;
      }
      .toggle-icon {
        flex-shrink: 0;
        font-size: 0.75rem;
        transition: transform 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
      }
      .item-price-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        font-size: 0.875rem;
        border: 1px solid #e3e6e6;
      }
      .breakdown-header {
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #d5d9d9;
      }
      .breakdown-header strong {
        color: #0f1111;
        font-size: 0.9rem;
      }
      .breakdown-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #565959;
        padding: 0.25rem 0;
      }
      .breakdown-label {
        font-weight: 500;
        color: #565959;
      }
      .breakdown-value {
        font-weight: 600;
        color: #0f1111;
        text-align: right;
      }
      .breakdown-row.breakdown-subtotal {
        font-weight: 600;
        color: #0f1111;
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        border-top: 1px solid #d5d9d9;
      }
      .breakdown-row.breakdown-total {
        font-weight: 700;
        color: #0f1111;
        font-size: 1rem;
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        border-top: 2px solid #0f1111;
        background: rgba(15, 23, 42, 0.03);
        padding: 0.75rem;
        border-radius: 6px;
      }
      .cart-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        flex-wrap: wrap;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #e3e6e6;
      }
      .qty-group {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d5d9d9;
        border-radius: 24px;
        overflow: hidden;
        background: #fff;
      }
      .qty-group button {
        background: #f0f2f2;
        border: none;
        width: 36px;
        height: 36px;
        cursor: pointer;
        font-size: 1.125rem;
        font-weight: 600;
        color: #0f1111;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .qty-group button:hover:not(:disabled) {
        background: #d5d9d9;
      }
      .qty-group button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .qty-group span {
        padding: 0 1rem;
        font-weight: 600;
        min-width: 50px;
        text-align: center;
        color: #0f1111;
        font-size: 0.95rem;
      }
      .remove-item-btn {
        background: transparent;
        border: 1px solid #d5d9d9;
        color: #c45500;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .remove-item-btn:hover {
        background: #fff5f0;
        border-color: #c45500;
        color: #b04800;
      }
      .remove-item-btn:active {
        background: #ffe5d4;
      }
      .cart-actions .link {
        background: none;
        border: none;
        color: #007185;
        font-weight: 500;
        cursor: not-allowed;
      }
      .cart-price {
        font-weight: 700;
        font-size: 1.25rem;
        color: #0f1111;
        text-align: right;
        align-self: flex-start;
        padding-top: 0.5rem;
      }
      .cart-subtotal {
        padding-top: 1.25rem;
        border-top: 1px solid #e3e6e6;
        text-align: right;
        font-size: 1rem;
      }
      .checkout-main form.details-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      label {
        display: flex;
        flex-direction: column;
        font-size: 0.9rem;
        color: #0f1111;
        gap: 0.35rem;
      }
      input,
      textarea {
        padding: 0.65rem 0.75rem;
        border: 1px solid #a6a6a6;
        border-radius: 8px;
        font-size: 0.95rem;
        transition: border 0.2s ease;
      }
      input:focus,
      textarea:focus {
        outline: none;
        border-color: #007185;
        box-shadow: 0 0 0 3px rgba(0, 113, 133, 0.15);
      }
      textarea {
        resize: vertical;
      }
      .payment-pill {
        border: 1px solid var(--premium-silver);
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        background: var(--premium-moonstone);
      }
      .badge {
        background: rgba(183, 110, 121, 0.1);
        color: var(--premium-rose-gold);
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        font-weight: 600;
      }
      .form-error {
        margin-bottom: 0;
      }
      .summary-panel {
        position: sticky;
        top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: fit-content;
      }
      .summary-discount-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #e3e6e6;
      }
      .summary-discount-header {
        margin-bottom: 0.75rem;
      }
      .summary-discount-header strong {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f1111;
      }
      .summary-discount-input-group {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .summary-discount-input-group input {
        flex: 1;
        padding: 0.65rem 0.75rem;
        border: 1px solid #a6a6a6;
        border-radius: 6px;
        font-size: 0.9rem;
        transition: border 0.2s ease;
      }
      .summary-discount-input-group input:focus {
        outline: none;
        border-color: #007185;
        box-shadow: 0 0 0 3px rgba(0, 113, 133, 0.1);
      }
      .summary-discount-input-group input:disabled {
        background: #f0f2f2;
        cursor: not-allowed;
        opacity: 0.6;
      }
      .btn-discount-apply {
        padding: 0.65rem 1rem;
        background: var(--premium-moonstone);
        border: 1px solid var(--premium-silver);
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .btn-discount-apply:hover:not(:disabled) {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      .btn-discount-apply:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .summary-discount-error {
        padding: 0.5rem 0.75rem;
        background: rgba(183, 110, 121, 0.12);
        border: 1px solid rgba(183, 110, 121, 0.4);
        border-radius: 6px;
        color: var(--premium-rose-gold);
        font-size: 0.85rem;
        margin-top: 0.5rem;
      }
      .summary-discount-success {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: rgba(6, 125, 98, 0.1);
        border: 1px solid rgba(6, 125, 98, 0.3);
        border-radius: 6px;
        color: #067d62;
        font-size: 0.85rem;
        margin-top: 0.5rem;
      }
      .summary-discount-success .link {
        background: none;
        border: none;
        color: #067d62;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
        font-size: 0.85rem;
      }
      .summary-breakdown {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e3e6e6;
      }
      .summary-breakdown .breakdown-header {
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #d5d9d9;
      }
      .summary-breakdown .breakdown-header strong {
        color: #0f1111;
        font-size: 1rem;
        font-weight: 600;
      }
      .summary-breakdown-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        font-size: 0.9rem;
      }
      .summary-breakdown-row .breakdown-label {
        font-weight: 500;
        color: #565959;
      }
      .summary-breakdown-row .breakdown-value {
        font-weight: 600;
        color: #0f1111;
        text-align: right;
      }
      .summary-breakdown-row.summary-subtotal {
        font-weight: 600;
        color: #0f1111;
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        border-top: 1px solid #d5d9d9;
      }
      .summary-total-line {
        display: flex;
        justify-content: space-between;
        font-size: 1rem;
        margin-bottom: 0.75rem;
      }
      .proceed {
        width: 100%;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
      }
      .mini-card {
        background: var(--premium-moonstone);
        border: 1px solid var(--premium-silver);
        border-radius: 18px;
        padding: 1.25rem;
      }
      .mini-card h3 {
        margin-top: 0;
        font-size: 1rem;
      }
      .mini-card ul {
        margin: 0.5rem 0 0;
        padding-left: 1.25rem;
        color: #565959;
        font-size: 0.9rem;
      }
      .discount-input-group {
        display: flex;
        gap: 0.75rem;
      }
      .discount-input-group input {
        flex: 1;
      }
      .discount-success {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: rgba(6, 125, 98, 0.1);
        border: 1px solid rgba(6, 125, 98, 0.3);
        border-radius: 8px;
        color: #067d62;
        font-size: 0.9rem;
      }
      .discount-success .link {
        background: none;
        border: none;
        color: #067d62;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
      }
      .method-selection-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }
      .method-select-group {
        display: flex;
        flex-direction: column;
      }
      .method-select-group label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .method-select-group select {
        padding: 0.85rem 1rem;
        border: 1px solid #a6a6a6;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #fff;
        color: #0f1111;
        cursor: pointer;
        transition: border 0.2s ease;
      }
      .method-select-group select:focus {
        outline: none;
        border-color: #007185;
        box-shadow: 0 0 0 3px rgba(0, 113, 133, 0.15);
      }
      .method-select-group select:disabled {
        background: #f0f2f2;
        cursor: not-allowed;
        opacity: 0.6;
      }
      .method-details {
        display: block;
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: var(--premium-titanium);
        line-height: 1.4;
      }
      .payment-details-card {
        margin-top: 0;
      }
      .payment-details-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .alert-info {
        padding: 1rem 1.25rem;
        background: rgba(56, 189, 248, 0.08);
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 8px;
        color: #0c4a6e;
      }
      .alert-info p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
      }
      .discount-line {
        color: #067d62;
      }
      .summary-total-line.total {
        font-size: 1.25rem;
        font-weight: 700;
        padding-top: 0.75rem;
        border-top: 2px solid var(--premium-silver);
        margin-top: 0.5rem;
      }
      @media (max-width: 960px) {
        .checkout-grid {
          grid-template-columns: 1fr;
        }
        .cart-item {
          grid-template-columns: auto 1fr;
        }
        .cart-price {
          justify-self: flex-start;
        }
        .method-selection-grid {
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        .grid-two {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CheckoutComponent implements OnInit {
  cartItems$: Observable<any[]>;
  cartTotal$: Observable<number>;
  finalTotal$: Observable<number>;
  checkoutForm: FormGroup;
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  paymentMethods = signal<PaymentMethod[]>([]);
  selectedPaymentMethod = signal<PaymentMethod | null>(null);
  shippingMethods = signal<ShippingMethod[]>([]);
  visibleBreakdowns = signal<Set<string>>(new Set());
  selectedShippingMethod = signal<ShippingMethod | null>(null);
  discountCode = '';
  applyingDiscount = signal(false);
  discountError = signal<string | null>(null);
  appliedDiscount = signal<ApplyDiscountResponse | null>(null);
  tenantBrand$ = this.brandingService.tenantBrandChanges$;

  constructor(
    private readonly store: Store<AppState>,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly orderService: OrderService,
    private readonly authService: AuthService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly discountService: DiscountService,
    private readonly paymentService: PaymentService,
    private readonly shippingMethodService: ShippingMethodService,
    private readonly brandingService: BrandingService
  ) {
    this.cartItems$ = this.store.select(selectCartItems);
    this.cartTotal$ = this.store.select(selectCartTotal);
    
    // Initialize finalTotal$ observable that reacts to cart, shipping, and discount changes
    // Calculate from cart items breakdown to ensure accuracy
    this.finalTotal$ = combineLatest([
      this.cartItems$,
      this.cartTotal$,
      toObservable(this.appliedDiscount).pipe(startWith(null)),
      toObservable(this.selectedShippingMethod).pipe(startWith(null)),
    ]).pipe(
      map(([cartItems, cartTotal, discount, shipping]) => {
        if (!cartItems || cartItems.length === 0) return 0;
        
        // Calculate total from breakdown if available, otherwise use cart total
        const breakdown = this.getTotalBreakdown(cartItems);
        let baseTotal = 0;
        
        if (breakdown) {
          // breakdown.subtotal is the subtotal before GST for all items
          // breakdown.gstAmount is the GST for all items
          // Final base total = subtotal + GST
          baseTotal = breakdown.subtotal + (breakdown.gstAmount || 0);
        } else {
          // Fallback to cart total (which should already include everything)
          baseTotal = cartTotal || 0;
        }
        
        if (baseTotal <= 0) return 0;
        
        const discountAmount = discount?.discountAmount || 0;
        const shippingCost = shipping?.baseCost?.amount || 0;
        
        // Calculate final total: base + shipping - discount
        const finalTotal = baseTotal + shippingCost - discountAmount;
        
        // Ensure we don't return negative values, but allow 0 if discount exceeds total
        return Math.max(0, Math.round(finalTotal * 100) / 100);
      })
    );

    this.checkoutForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      // Payment details
      cardNumber: [''],
      cardholderName: [''],
      expiryDate: [''],
      cvv: [''],
      paypalEmail: [''],
      accountNumber: [''],
      bankName: [''],
      routingNumber: [''],
      accountHolderName: [''],
      walletId: [''],
      paymentReference: [''],
      paymentNotes: [''],
    });
  }

  ngOnInit(): void {
    // Check if cart is empty
    this.cartItems$.subscribe((items) => {
      if (items.length === 0) {
        // Redirect to store if cart is empty
      }
    });

    this.paymentMethodService
      .listPaymentMethods(true)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((response) => {
        const items = response.items || [];
        this.paymentMethods.set(items);
        // Default to COD if available, otherwise first method
        const cod = items.find((method) => method.type === 'CashOnDelivery');
        const defaultMethod = cod || items[0] || null;
        this.selectedPaymentMethod.set(defaultMethod);
        if (defaultMethod) {
          this.updatePaymentFormValidators();
        }
      });

    this.shippingMethodService
      .listShippingMethods(true)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((response) => {
        const items = response.items || [];
        this.shippingMethods.set(items);
        // Default to first shipping method (usually Standard Shipping)
        this.selectedShippingMethod.set(items[0] || null);
      });

    // Pre-populate form with user info if available
    const storedUser = this.authService.getStoredUser();
    if (storedUser) {
      this.checkoutForm.patchValue({
        fullName: storedUser.full_name,
        email: storedUser.email,
      });
    } else {
      // Try to fetch current user from API
      this.authService.getCurrentUser().pipe(
        catchError(() => of(null))
      ).subscribe((user) => {
        if (user) {
          this.checkoutForm.patchValue({
            fullName: user.full_name,
            email: user.email,
          });
        }
      });
    }
  }

  placeOrder(): void {
    if (this.checkoutForm.invalid) {
      return;
    }

    this.submitting.set(true);

    // Get current user ID
    const storedUser = this.authService.getStoredUser();
    if (!storedUser) {
      // Try to fetch user from API
      this.cartItems$.pipe(take(1)).subscribe((items) => {
        this.authService.getCurrentUser().pipe(take(1)).subscribe({
          next: (user) => {
            this.createOrderWithUser(user.id, items);
          },
          error: () => {
            this.errorMessage.set('Please log in to place an order.');
            this.submitting.set(false);
          },
        });
      });
      return;
    }

    if (!this.selectedPaymentMethod()) {
      this.errorMessage.set('Please select a payment method.');
      this.submitting.set(false);
      return;
    }

    this.cartItems$.pipe(take(1)).subscribe((items) => {
      this.createOrderWithUser(storedUser.id, items);
    });
  }

  private createOrderWithUser(customerId: string, items: any[]): void {
    const subtotal = items.reduce((sum, item) => sum + item.price.amount * item.quantity, 0);
    const discountAmount = this.appliedDiscount()?.discountAmount || 0;
    const finalAmount = subtotal - discountAmount;

    const checkoutPayload = {
      order: {
        customerId: customerId,
        paymentMethodId: this.selectedPaymentMethod()?.id || '',
        shippingAddress: `${this.checkoutForm.value.address}, ${this.checkoutForm.value.city}, ${this.checkoutForm.value.state} ${this.checkoutForm.value.zipCode}`,
        shippingMethodId: this.selectedShippingMethod()?.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      },
      paymentMethodId: undefined, // For Stripe, this would be the payment method ID
    };

    this.orderService.checkout(checkoutPayload).subscribe({
      next: (result) => {
        if (result.requiresPaymentConfirmation && result.paymentTransaction) {
          // Handle payment confirmation for Stripe/Razorpay
          this.handlePaymentConfirmation(result.paymentTransaction);
        } else {
          // Order completed (COD or payment succeeded)
          this.store.dispatch(OrdersActions.createOrderSuccess({ order: result.order }));
          this.store.dispatch(CartActions.clearCart());
          this.router.navigate(['/my-orders']);
          this.submitting.set(false);
        }
      },
      error: (error) => {
        console.error('Checkout failed:', error);
        const message =
          error.error?.detail && typeof error.error.detail === 'string'
            ? error.error.detail
            : 'Failed to place order. Please try again.';
        this.errorMessage.set(message);
        this.submitting.set(false);
      },
    });
  }

  private handlePaymentConfirmation(paymentTransaction: { id: string; clientSecret?: string; provider: string }): void {
    // TODO: Integrate Stripe/Razorpay SDKs for payment confirmation
    // For now, show message - in production, this would open payment modal
    if (paymentTransaction.provider === 'Stripe' && paymentTransaction.clientSecret) {
      this.errorMessage.set('Stripe payment integration pending. Please use Cash on Delivery for now.');
    } else if (paymentTransaction.provider === 'Razorpay') {
      this.errorMessage.set('Razorpay payment integration pending. Please use Cash on Delivery for now.');
    } else {
      this.errorMessage.set('Payment confirmation required. Please contact support.');
    }
    this.submitting.set(false);
  }

  applyDiscountCode(): void {
    if (!this.discountCode.trim()) {
      this.discountError.set('Please enter a discount code.');
      return;
    }

    this.applyingDiscount.set(true);
    this.discountError.set(null);

    this.cartItems$.pipe(take(1)).subscribe((items) => {
      const subtotal = items.reduce((sum, item) => sum + item.price.amount * item.quantity, 0);

      this.discountService
        .applyDiscount({
          code: this.discountCode.trim().toUpperCase(),
          orderAmount: subtotal,
          orderCurrency: 'INR',
        })
        .subscribe({
          next: (response) => {
            this.appliedDiscount.set(response);
            this.discountError.set(null);
            this.applyingDiscount.set(false);
          },
          error: (error) => {
            this.discountError.set(
              error.error?.detail && typeof error.error.detail === 'string'
                ? error.error.detail
                : 'Invalid or expired discount code.'
            );
            this.applyingDiscount.set(false);
          },
        });
    });
  }

  removeDiscount(): void {
    this.appliedDiscount.set(null);
    this.discountCode = '';
    this.discountError.set(null);
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod.set(method);
    this.updatePaymentFormValidators();
  }

  selectShippingMethod(method: ShippingMethod): void {
    this.selectedShippingMethod.set(method);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity > 0) {
      // Get the current cart item to recalculate price
      this.cartItems$.pipe(take(1)).subscribe((items) => {
        const item = items.find((i) => i.productId === productId);
        if (item && item.priceBreakdown) {
          // Recalculate price breakdown for new quantity
          // We need to get the product details to recalculate
          // For now, just update quantity - price will be recalculated when item is added
          this.store.dispatch(CartActions.updateQuantity({ productId, quantity }));
        } else {
          this.store.dispatch(CartActions.updateQuantity({ productId, quantity }));
        }
      });
    } else {
      this.store.dispatch(CartActions.removeItem({ productId }));
    }
  }

  removeItem(productId: string): void {
    this.store.dispatch(CartActions.removeItem({ productId }));
    // Remove from visible breakdowns if item is removed
    const current = this.visibleBreakdowns();
    current.delete(productId);
    this.visibleBreakdowns.set(new Set(current));
  }

  toggleItemBreakdown(productId: string): void {
    const current = this.visibleBreakdowns();
    if (current.has(productId)) {
      current.delete(productId);
    } else {
      current.add(productId);
    }
    this.visibleBreakdowns.set(new Set(current));
  }

  isBreakdownVisible(productId: string): boolean {
    return this.visibleBreakdowns().has(productId);
  }

  getSummaryItems(cart: any[]): SummaryItem[] {
    const items: SummaryItem[] = [];
    const breakdown = this.getTotalBreakdown(cart);
    
    if (breakdown) {
      if (breakdown.metalValue > 0) {
        items.push({ label: 'Metal Value', value: breakdown.metalValue, currency: 'INR' });
      }
      if (breakdown.wastageValue > 0) {
        items.push({ label: 'Wastage Value', value: breakdown.wastageValue, currency: 'INR' });
      }
      if (breakdown.makingCharges > 0) {
        items.push({ label: 'Making Charges', value: breakdown.makingCharges, currency: 'INR' });
      }
      if (breakdown.stoneCharges > 0) {
        items.push({ label: 'Stone Charges', value: breakdown.stoneCharges, currency: 'INR' });
      }
      items.push({ label: 'Subtotal', value: breakdown.subtotal, currency: 'INR' });
      if (breakdown.gstAmount > 0) {
        items.push({ label: 'GST', value: breakdown.gstAmount, currency: 'INR' });
      }
    } else {
      // Fallback to simple subtotal
      this.cartTotal$.pipe(take(1)).subscribe(total => {
        items.push({ label: `Subtotal (${cart.length} ${cart.length === 1 ? 'item' : 'items'})`, value: total, currency: 'INR' });
      });
    }

    // Add shipping
    const shipping = this.selectedShippingMethod();
    if (shipping) {
      items.push({ 
        label: `Shipping (${shipping.name})`, 
        value: shipping.baseCost.amount, 
        currency: shipping.baseCost.currency || 'INR' 
      });
    }

    // Add discount
    const discount = this.appliedDiscount();
    if (discount) {
      items.push({ 
        label: `Discount (${discount.discount.code})`, 
        value: -(discount.discountAmount || 0), 
        currency: discount.discountCurrency || 'INR' 
      });
    }

    // Note: Total is handled by CheckoutSummaryComponent via [total] input
    // Don't add it here to avoid async subscription issues

    return items;
  }

  getTotalBreakdown(cart: any[]): { metalValue: number; wastageValue: number; makingCharges: number; stoneCharges: number; subtotal: number; gstAmount: number } | null {
    if (!cart || cart.length === 0) return null;
    
    let totalMetalValue = 0;
    let totalWastageValue = 0;
    let totalMakingCharges = 0;
    let totalStoneCharges = 0;
    let totalSubtotal = 0;
    let totalGstAmount = 0;

    for (const item of cart) {
      if (item.priceBreakdown) {
        // priceBreakdown contains per-unit values, multiply by quantity
        const qty = item.quantity || 1;
        totalMetalValue += (item.priceBreakdown.metalValue || 0) * qty;
        totalWastageValue += (item.priceBreakdown.wastageValue || 0) * qty;
        totalMakingCharges += (item.priceBreakdown.makingCharges || 0) * qty;
        totalStoneCharges += (item.priceBreakdown.stoneCharges || 0) * qty;
        totalSubtotal += (item.priceBreakdown.subtotal || 0) * qty;
        totalGstAmount += (item.priceBreakdown.gstAmount || 0) * qty;
      }
    }

    // Only return breakdown if we have at least one item with breakdown
    if (totalMetalValue === 0 && totalWastageValue === 0 && totalMakingCharges === 0 && totalStoneCharges === 0) {
      return null;
    }

    return {
      metalValue: totalMetalValue,
      wastageValue: totalWastageValue,
      makingCharges: totalMakingCharges,
      stoneCharges: totalStoneCharges,
      subtotal: totalSubtotal,
      gstAmount: totalGstAmount,
    };
  }

  onPaymentMethodChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const methodId = selectElement.value;
    const method = this.paymentMethods().find((m) => m.id === methodId);
    if (method) {
      this.selectPaymentMethod(method);
    }
  }

  onShippingMethodChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const methodId = selectElement.value;
    const method = this.shippingMethods().find((m) => m.id === methodId);
    if (method) {
      this.selectShippingMethod(method);
    }
  }

  private updatePaymentFormValidators(): void {
    const method = this.selectedPaymentMethod();
    if (!method) return;

    // Reset all payment validators
    this.checkoutForm.get('cardNumber')?.clearValidators();
    this.checkoutForm.get('cardholderName')?.clearValidators();
    this.checkoutForm.get('expiryDate')?.clearValidators();
    this.checkoutForm.get('cvv')?.clearValidators();
    this.checkoutForm.get('paypalEmail')?.clearValidators();
    this.checkoutForm.get('accountNumber')?.clearValidators();
    this.checkoutForm.get('bankName')?.clearValidators();
    this.checkoutForm.get('routingNumber')?.clearValidators();
    this.checkoutForm.get('accountHolderName')?.clearValidators();
    this.checkoutForm.get('walletId')?.clearValidators();
    this.checkoutForm.get('paymentReference')?.clearValidators();

    // Set validators based on payment method type
    switch (method.type) {
      case 'CreditCard':
      case 'DebitCard':
        this.checkoutForm.get('cardNumber')?.setValidators([Validators.required]);
        this.checkoutForm.get('cardholderName')?.setValidators([Validators.required]);
        this.checkoutForm.get('expiryDate')?.setValidators([Validators.required]);
        this.checkoutForm.get('cvv')?.setValidators([Validators.required]);
        break;
      case 'PayPal':
        this.checkoutForm.get('paypalEmail')?.setValidators([Validators.required, Validators.email]);
        break;
      case 'BankTransfer':
        this.checkoutForm.get('accountNumber')?.setValidators([Validators.required]);
        this.checkoutForm.get('bankName')?.setValidators([Validators.required]);
        this.checkoutForm.get('routingNumber')?.setValidators([Validators.required]);
        this.checkoutForm.get('accountHolderName')?.setValidators([Validators.required]);
        break;
      case 'DigitalWallet':
        this.checkoutForm.get('walletId')?.setValidators([Validators.required]);
        break;
      case 'Other':
        this.checkoutForm.get('paymentReference')?.setValidators([Validators.required]);
        break;
    }

    // Update validity
    Object.keys(this.checkoutForm.controls).forEach((key) => {
      this.checkoutForm.get(key)?.updateValueAndValidity();
    });
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\s/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    value = value.replace(/(.{4})/g, '$1 ').trim();
    input.value = value;
    this.checkoutForm.patchValue({ cardNumber: value });
  }

  formatExpiryDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    input.value = value;
    this.checkoutForm.patchValue({ expiryDate: value });
  }

  formatCVV(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    input.value = value;
    this.checkoutForm.patchValue({ cvv: value });
  }

  getPaymentMethodDescription(type: string): string {
    const descriptions: Record<string, string> = {
      CashOnDelivery: 'Securely collected at delivery by our courier partner.',
      Stripe: 'Pay securely with credit or debit card.',
      Razorpay: 'Pay securely with UPI, cards, or netbanking.',
    };
    return descriptions[type] || 'Secure payment method.';
  }

  getPaymentMethodBadge(type: string): string {
    const badges: Record<string, string> = {
      CashOnDelivery: 'COD',
      Stripe: 'Card',
      Razorpay: 'UPI/Card',
    };
    return badges[type] || type;
  }

}

