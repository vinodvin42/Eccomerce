import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';

import { CatalogService } from '../../core/services/catalog.service';
import { OrderService } from '../../core/services/order.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import type { Product } from '../../shared/models/catalog';
import type { CreateOrderRequest, Order, OrderListResponse } from '../../shared/models/order';
import type { PaymentMethod } from '../../shared/models/payment-method';
import type { User } from '../../shared/models/user';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, ModalComponent],
  template: `
    <div class="page-container-wide">
      <!-- Header -->
      <header class="page-hero">
        <div>
          <p class="eyebrow">Checkout command</p>
          <h1>Orders &amp; Fulfillment hub</h1>
          <p class="page-subtitle">
            Mirror the shopper checkout experience while keeping finance, CX, and logistics in the loop.
          </p>
          <div class="hero-tags">
            <span>Realtime status</span>
            <span>Multi-tenant safe</span>
            <span>Stripe • Razorpay ready</span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn-secondary ghost" type="button" (click)="refreshOrders()" [disabled]="loading()">
            ↻ Refresh
          </button>
          <button class="btn-primary" type="button" (click)="showCreateForm.set(true)">
            <span>➕</span>
            Create order
          </button>
        </div>
      </header>

      <section class="insights-grid">
        <article class="insight-card">
          <p>Total orders</p>
          <h3>{{ totalOrders() | number }}</h3>
          <small>All time</small>
        </article>
        <article class="insight-card">
          <p>Pending payment</p>
          <h3>{{ ordersInsights().pending }}</h3>
          <small>Awaiting capture</small>
        </article>
        <article class="insight-card">
          <p>Confirmed</p>
          <h3>{{ ordersInsights().confirmed }}</h3>
          <small>Ready to fulfill</small>
        </article>
        <article class="insight-card highlight">
          <p>Checkout revenue (current view)</p>
          <h3>{{ ordersInsights().revenue | currency : 'USD' }}</h3>
          <small>Avg {{ ordersInsights().average | currency : 'USD' }} per order</small>
        </article>
      </section>

      <!-- Create Order Modal -->
      <app-modal [isOpen]="showCreateForm()" title="Create New Order" (closeModal)="cancelCreate()">
        <form [formGroup]="form" (ngSubmit)="submit()" class="order-form">
          <div class="form-section">
            <h3>Customer Information</h3>
            <div class="form-row">
              <label class="search-field">
                <span>Customer *</span>
                <div class="search-container">
                  <input
                    type="text"
                    class="search-input"
                    placeholder="Search by name or email..."
                    [value]="customerSearchTerm()"
                    (input)="onCustomerSearch($event)"
                    (focus)="showCustomerDropdown.set(true)"
                    (blur)="onCustomerBlur()"
                  />
                  <span class="search-icon">🔍</span>
                  <div *ngIf="showCustomerDropdown() && customerSearchResults().length > 0" class="dropdown">
                    <div
                      *ngFor="let customer of customerSearchResults()"
                      class="dropdown-item"
                      (mousedown)="selectCustomer(customer)"
                    >
                      <div class="customer-info">
                        <strong>{{ customer.full_name }}</strong>
                        <span class="customer-email">{{ customer.email }}</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="showCustomerDropdown() && customerSearchResults().length === 0 && customerSearchTerm()" class="dropdown">
                    <div class="dropdown-item no-results">No customers found</div>
                  </div>
                </div>
                <div *ngIf="selectedCustomer()" class="selected-item">
                  <span>Selected: <strong>{{ selectedCustomer()?.full_name }}</strong> ({{ selectedCustomer()?.email }})</span>
                  <button type="button" class="btn-clear" (click)="clearCustomer()">✕</button>
                </div>
                <small *ngIf="form.get('customerId')?.invalid && form.get('customerId')?.touched">
                  Customer is required
                </small>
              </label>
              <label class="search-field">
                <span>Payment Method *</span>
                <div class="search-container">
                  <input
                    type="text"
                    class="search-input"
                    placeholder="Search payment methods..."
                    [value]="paymentMethodSearchTerm()"
                    (input)="onPaymentMethodSearch($event)"
                    (focus)="showPaymentMethodDropdown.set(true)"
                    (blur)="onPaymentMethodBlur()"
                  />
                  <span class="search-icon">🔍</span>
                  <div *ngIf="showPaymentMethodDropdown() && paymentMethodSearchResults().length > 0" class="dropdown">
                    <div
                      *ngFor="let method of paymentMethodSearchResults()"
                      class="dropdown-item"
                      (mousedown)="selectPaymentMethod(method)"
                    >
                      <div class="payment-method-info">
                        <strong>{{ method.name }}</strong>
                        <span class="payment-method-type">{{ method.type }}</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="showPaymentMethodDropdown() && paymentMethodSearchResults().length === 0 && paymentMethodSearchTerm()" class="dropdown">
                    <div class="dropdown-item no-results">No payment methods found</div>
                  </div>
                </div>
                <div *ngIf="selectedPaymentMethod()" class="selected-item">
                  <span>Selected: <strong>{{ selectedPaymentMethod()?.name }}</strong> ({{ selectedPaymentMethod()?.type }})</span>
                  <button type="button" class="btn-clear" (click)="clearPaymentMethod()">✕</button>
                </div>
                <small *ngIf="form.get('paymentMethodId')?.invalid && form.get('paymentMethodId')?.touched">
                  Payment Method is required
                </small>
              </label>
            </div>
            <div class="form-row-full">
              <label>
                <span>Shipping Address</span>
                <textarea
                  formControlName="shippingAddress"
                  placeholder="Enter complete shipping address (street, city, state, zip code, country)"
                  rows="4"
                  class="shipping-textarea"
                ></textarea>
                <small class="field-hint">Include street address, city, state/province, postal code, and country</small>
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Order Items</h3>
              <button type="button" class="btn-secondary" (click)="addItem()">
                <span>➕</span>
                Add Item
              </button>
            </div>

            <div formArrayName="items" class="items-container">
              <div
                *ngFor="let item of items.controls; let i = index"
                [formGroupName]="i"
                class="order-item-card"
              >
                <div class="item-header">
                  <h4>Item {{ i + 1 }}</h4>
                  <button
                    type="button"
                    class="btn-remove"
                    (click)="removeItem(i)"
                    [disabled]="items.length === 1"
                  >
                    🗑️ Remove
                  </button>
                </div>
                <div class="form-row">
                  <label class="search-field">
                    <span>Product *</span>
                    <div class="search-container">
                      <input
                        type="text"
                        class="search-input"
                        placeholder="Search by name or SKU..."
                        [value]="getProductSearchTerm(i)"
                        (input)="onProductSearch($event, i)"
                        (focus)="showProductDropdown.set(i)"
                        (blur)="onProductBlur(i)"
                      />
                      <span class="search-icon">🔍</span>
                      <div *ngIf="showProductDropdown() === i && getProductSearchResults(i).length > 0" class="dropdown">
                        <div
                          *ngFor="let product of getProductSearchResults(i)"
                          class="dropdown-item"
                          (mousedown)="selectProduct(product, i)"
                        >
                          <div class="product-info">
                            <strong>{{ product.name }}</strong>
                            <span class="product-details">
                              SKU: {{ product.sku }} | 
                              {{ product.price.amount | currency : product.price.currency }} | 
                              Stock: {{ product.inventory }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div *ngIf="showProductDropdown() === i && getProductSearchResults(i).length === 0 && getProductSearchTerm(i)" class="dropdown">
                        <div class="dropdown-item no-results">No products found</div>
                      </div>
                    </div>
                    <div *ngIf="getSelectedProduct(i)" class="selected-item">
                      <span>
                        Selected: <strong>{{ getSelectedProduct(i)?.name }}</strong> 
                        ({{ getSelectedProduct(i)?.price.amount | currency : getSelectedProduct(i)?.price.currency }})
                      </span>
                      <button type="button" class="btn-clear" (click)="clearProduct(i)">✕</button>
                    </div>
                    <small *ngIf="item.get('productId')?.invalid && item.get('productId')?.touched">
                      Product is required
                    </small>
                  </label>
                  <label>
                    <span>Quantity *</span>
                    <input formControlName="quantity" type="number" min="1" placeholder="1" />
                    <small *ngIf="item.get('quantity')?.invalid && item.get('quantity')?.touched">
                      Valid quantity is required
                    </small>
                  </label>
                  <label>
                    <span>Unit Price (USD) *</span>
                    <input 
                      formControlName="amount" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="0.00"
                      [value]="getProductPrice(i)"
                      readonly
                    />
                    <small class="field-hint">Auto-filled from product</small>
                    <small *ngIf="item.get('amount')?.invalid && item.get('amount')?.touched">
                      Valid price is required
                    </small>
                  </label>
                </div>
                <div class="item-subtotal">
                  <label>
                    <span>Item Subtotal</span>
                    <input 
                      type="text" 
                      [value]="getItemSubtotal(i) | currency : 'USD'"
                      readonly
                      class="readonly-field"
                    />
                  </label>
                </div>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="order-summary">
              <h3>Order Summary</h3>
              <div class="summary-row">
                <span>Subtotal:</span>
                <strong>{{ getOrderSubtotal() | currency : 'USD' }}</strong>
              </div>
              <div class="summary-row">
                <span>Tax:</span>
                <strong>{{ getOrderTax() | currency : 'USD' }}</strong>
              </div>
              <div class="summary-row total-row">
                <span>Total:</span>
                <strong>{{ getOrderTotal() | currency : 'USD' }}</strong>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="cancelCreate()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || submitInFlight()">
              <span *ngIf="submitInFlight()">⏳</span>
              <span *ngIf="!submitInFlight()">💾</span>
              {{ submitInFlight() ? 'Creating...' : 'Create Order' }}
            </button>
          </div>
        </form>
      </app-modal>

      <!-- Orders List -->
      <div class="panel orders-list-panel">
        <div class="panel-header">
          <div>
            <h2>Orders</h2>
            <p class="panel-subtitle">Total: {{ totalOrders() }} orders</p>
          </div>
          <div class="filters-container">
            <select class="filter-select" (change)="onStatusFilterChange($event)" [value]="statusFilter()">
              <option value="">All Statuses</option>
              <option value="PendingPayment">Pending Payment</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <input
              type="text"
              class="search-input"
              placeholder="Filter by Customer ID..."
              (input)="onCustomerFilterChange($event)"
              [value]="customerFilter()"
            />
            <button class="btn-secondary" (click)="resetFilters()" [disabled]="loading() || (!statusFilter() && !customerFilter())">
              Clear
            </button>
            <button class="btn-secondary" (click)="refreshOrders()" [disabled]="loading()">
              <span>🔄</span>
              Refresh
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="loading-state">
          <div class="spinner"></div>
          <p>Loading orders...</p>
        </div>

        <!-- Orders Table -->
        <div class="table-container" *ngIf="(orders$ | async) as orders">
          <ng-container *ngIf="!error(); else errorState">
            <div *ngIf="orders.items.length > 0; else emptyState">
              <table class="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer ID</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let order of orders.items" class="order-row">
                    <td *ngIf="editingOrderId() !== order.id" class="order-id-cell">
                      <code>{{ order.id.substring(0, 8) }}...</code>
                    </td>
                    <td *ngIf="editingOrderId() === order.id" colspan="7" class="edit-form-cell">
                      <form [formGroup]="editOrderForm" (ngSubmit)="updateOrder(order.id)" class="edit-order-form">
                        <div class="form-row">
                          <label>
                            <span>Status *</span>
                            <select formControlName="status">
                              <option value="PendingPayment">Pending Payment</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </label>
                          <label class="full-width">
                            <span>Shipping Address</span>
                            <textarea formControlName="shippingAddress" rows="2"></textarea>
                          </label>
                        </div>
                        <div class="form-actions">
                          <button type="submit" class="btn-primary" [disabled]="editOrderForm.invalid || updateInFlight()">
                            {{ updateInFlight() ? 'Saving...' : 'Save' }}
                          </button>
                          <button type="button" class="btn-secondary" (click)="cancelEditOrder()">Cancel</button>
                        </div>
                      </form>
                    </td>
                    <td *ngIf="editingOrderId() !== order.id" class="customer-id-cell">
                      <code>{{ order.customerId?.substring(0, 8) || 'N/A' }}...</code>
                    </td>
                    <td *ngIf="editingOrderId() !== order.id" class="status-cell">
                      <span
                        class="status-badge"
                        [class.status-pending]="order.status === 'PendingPayment'"
                        [class.status-confirmed]="order.status === 'Confirmed'"
                        [class.status-cancelled]="order.status === 'Cancelled'"
                      >
                        {{ getStatusLabel(order.status) }}
                      </span>
                    </td>
                    <td *ngIf="editingOrderId() !== order.id" class="items-cell">
                      <span class="items-count">{{ order.items?.length || 0 }} items</span>
                    </td>
                    <td *ngIf="editingOrderId() !== order.id" class="total-cell">
                      <strong>{{ order.total?.amount | currency : (order.total?.currency || 'USD') }}</strong>
                    </td>
                    <td *ngIf="editingOrderId() !== order.id" class="date-cell">
                      {{ order.audit?.createdDate | date : 'short' }}
                    </td>
                    <td *ngIf="editingOrderId() !== order.id" class="actions-cell">
                      <button class="btn-view" (click)="viewOrder(order.id)">View</button>
                      <button class="btn-edit" (click)="startEditOrder(order)">✏️ Edit</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination-controls">
                <button
                  class="btn-secondary"
                  type="button"
                  (click)="changePage('prev', orders.total)"
                  [disabled]="page() === 1 || loading()"
                >
                  ← Prev
                </button>
                <span class="page-info">
                  Page {{ page() }} of {{ getTotalPages(orders.total) }} · {{ orders.total }} orders
                </span>
                <button
                  class="btn-secondary"
                  type="button"
                  (click)="changePage('next', orders.total)"
                  [disabled]="page() >= getTotalPages(orders.total) || loading()"
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
          </ng-container>
        </div>

        <ng-template #errorState>
          <div class="error-state">
            <span class="error-icon">⚠️</span>
            <p>{{ error() }}</p>
            <button class="btn-secondary" (click)="refreshOrders()">Retry</button>
          </div>
        </ng-template>

        <ng-template #emptyState>
          <div class="empty-state" *ngIf="!loading()">
            <div class="empty-icon">📦</div>
            <h3>No orders found</h3>
            <p *ngIf="statusFilter() || customerFilter()">Try adjusting your filters</p>
            <p *ngIf="!statusFilter() && !customerFilter()">No orders have been created yet</p>
            <button *ngIf="!statusFilter() && !customerFilter()" class="btn-primary" (click)="showCreateForm.set(true)">
              Create First Order
            </button>
          </div>
        </ng-template>
      </div>

      <!-- Order Detail Drawer -->
      <div class="order-detail-overlay" *ngIf="detailDrawerOpen()">
        <div class="overlay-backdrop" (click)="closeOrderDetail()"></div>
        <section class="order-detail-panel" role="dialog" aria-modal="true">
          <header class="drawer-header">
            <div>
              <p class="drawer-eyebrow">Order overview</p>
              <h2 *ngIf="selectedOrder(); else fallbackTitle">
                #{{ selectedOrder()?.id?.slice(0, 8) }}
              </h2>
              <ng-template #fallbackTitle>
                <h2>Order details</h2>
              </ng-template>
              <p *ngIf="selectedOrder()?.audit?.createdDate">
                Placed on {{ selectedOrder()?.audit?.createdDate | date : 'medium' }}
              </p>
            </div>
            <button
              class="drawer-close"
              type="button"
              aria-label="Close order detail"
              (click)="closeOrderDetail()"
            >
              ✕
            </button>
          </header>

          <div class="detail-alert" *ngIf="detailActionMessage()">
            {{ detailActionMessage() }}
          </div>

          <div *ngIf="orderDetailLoading()" class="detail-loading">
            <div class="spinner"></div>
            <p>Loading order details...</p>
          </div>

          <div *ngIf="orderDetailError() && !orderDetailLoading()" class="detail-error">
            <p>{{ orderDetailError() }}</p>
            <button class="btn-secondary" type="button" (click)="retryOrderDetail()">Try Again</button>
          </div>

          <ng-container *ngIf="!orderDetailLoading() && !orderDetailError() && selectedOrder() as detail">
            <div class="detail-status">
              <span
                class="status-badge"
                [class.status-pending]="detail.status === 'PendingPayment'"
                [class.status-confirmed]="detail.status === 'Confirmed'"
                [class.status-cancelled]="detail.status === 'Cancelled'"
              >
                {{ getStatusLabel(detail.status) }}
              </span>
              <div class="detail-actions">
                <button class="btn-secondary" type="button" (click)="copyOrderId(detail.id)">Copy ID</button>
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-card">
                <p class="label">Customer</p>
                <p class="value">{{ detail.customerId || 'N/A' }}</p>
              </div>
              <div class="detail-card">
                <p class="label">Order total</p>
                <p class="value">{{ detail.total.amount | currency : detail.total.currency }}</p>
              </div>
              <div class="detail-card">
                <p class="label">Created</p>
                <p class="value">{{ detail.audit?.createdDate | date : 'medium' }}</p>
              </div>
              <div class="detail-card">
                <p class="label">Shipping to</p>
                <p class="value">{{ detail.shippingAddress || 'Captured during checkout' }}</p>
              </div>
            </div>

            <section class="detail-section">
              <div class="section-heading">
                <h3>Items ({{ detail.items.length }})</h3>
              </div>
              <div class="detail-items">
                <article *ngFor="let item of detail.items" class="detail-item">
                  <div>
                    <strong>Product {{ item.productId.slice(0, 8) }}</strong>
                    <p>{{ item.quantity }} × {{ item.unitPrice.amount | currency : item.unitPrice.currency }}</p>
                  </div>
                  <span class="value">
                    {{ item.unitPrice.amount * item.quantity | currency : item.unitPrice.currency }}
                  </span>
                </article>
              </div>
            </section>

            <section class="detail-section">
              <div class="section-heading">
                <h3>Fulfillment timeline</h3>
              </div>
              <div class="timeline">
                <div class="timeline-step active">
                  <span class="dot"></span>
                  <span>Received</span>
                </div>
                <div class="bar" [class.active]="detail.status !== 'PendingPayment'"></div>
                <div class="timeline-step" [class.active]="detail.status !== 'PendingPayment'">
                  <span class="dot"></span>
                  <span>Paid</span>
                </div>
                <div class="bar" [class.active]="detail.status === 'Confirmed'"></div>
                <div class="timeline-step" [class.active]="detail.status === 'Confirmed'">
                  <span class="dot"></span>
                  <span>Ready</span>
                </div>
              </div>
            </section>
          </ng-container>
        </section>
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage()" class="success-message">
        <span>✅</span>
        <p>{{ successMessage() }}</p>
        <button class="btn-close" (click)="successMessage.set(null)">✕</button>
      </div>
    </div>
  `,
  styles: [
    `

      .page-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.5rem;
        padding: 2rem;
        border-radius: 1.5rem;
        background: linear-gradient(135deg, #0f172a, #312e81);
        color: #f8fafc;
        margin-bottom: 1.5rem;
      }

      .page-hero h1 {
        margin: 0.5rem 0;
        font-size: 2.4rem;
        font-weight: 700;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.75rem;
        color: #fbbf24;
        margin: 0;
      }

      .page-subtitle {
        margin: 0;
        color: rgba(248, 250, 252, 0.85);
        max-width: 540px;
      }

      .hero-tags {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 1rem;
      }

      .hero-tags span {
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        background: rgba(248, 250, 252, 0.12);
        border: 1px solid rgba(248, 250, 252, 0.2);
        font-size: 0.85rem;
      }

      .hero-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .btn-secondary.ghost {
        background: transparent;
        border: 1px dashed rgba(248, 250, 252, 0.5);
        color: inherit;
      }


      .insight-card.highlight {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border: none;
      }


      .create-order-panel {
        border: 2px solid var(--premium-rose-gold);
      }

      .create-order-panel h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        color: var(--premium-onyx);
      }

      .order-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-section h3 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--premium-rose-gold);
        border-bottom: 2px solid var(--premium-silver);
        padding-bottom: 0.5rem;
      }

      .form-row-full {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .shipping-textarea {
        min-height: 100px;
        width: 100%;
        line-height: 1.5;
      }

      .form-row-full input:focus,
      .form-row-full textarea:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .form-row-full small {
        color: #ef4444;
        font-size: 0.75rem;
      }

      .field-hint {
        color: var(--premium-titanium) !important;
        font-size: 0.75rem;
        font-style: italic;
      }

      /* Search field styles */
      .search-field {
        position: relative;
      }

      .search-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-input {
        width: 100%;
        padding: 0.75rem 2.5rem 0.75rem 1rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
        transition: all 0.2s;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .search-icon {
        position: absolute;
        right: 0.75rem;
        color: var(--premium-titanium);
        pointer-events: none;
      }

      .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        margin-top: 0.25rem;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 20px 40px var(--premium-shadow);
      }

      .dropdown-item {
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
        border-bottom: 1px solid var(--premium-silver);
        color: var(--premium-onyx);
      }

      .dropdown-item:last-child {
        border-bottom: none;
      }

      .dropdown-item:hover {
        background-color: var(--premium-moonstone);
      }

      .dropdown-item.no-results {
        color: #94a3b8;
        cursor: default;
        text-align: center;
        font-style: italic;
      }

      .dropdown-item.no-results:hover {
        background-color: transparent;
      }

      .customer-info,
      .product-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .customer-info strong,
      .product-info strong {
        color: #f8fafc;
        font-size: 0.95rem;
      }

      .customer-email,
      .product-details {
        color: #94a3b8;
        font-size: 0.85rem;
      }

      .selected-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: rgba(56, 189, 248, 0.1);
        border: 1px solid rgba(56, 189, 248, 0.3);
        border-radius: 0.5rem;
        color: #cbd5e1;
        font-size: 0.875rem;
      }

      .selected-item strong {
        color: #38bdf8;
      }

      .btn-clear {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        transition: all 0.2s;
        font-size: 1rem;
        line-height: 1;
      }

      .btn-clear:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .payment-method-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .payment-method-type {
        color: #94a3b8;
        font-size: 0.85rem;
        text-transform: capitalize;
      }

      .readonly-field {
        background: rgba(56, 189, 248, 0.1) !important;
        color: #38bdf8 !important;
        cursor: not-allowed;
        font-weight: 600;
      }

      .order-summary {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-top: 2rem;
      }

      .order-summary h3 {
        margin: 0 0 1rem 0;
        color: #38bdf8;
        font-size: 1.25rem;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: #cbd5e1;
      }

      .summary-row:last-child {
        border-bottom: none;
      }

      .summary-row.total-row {
        font-size: 1.25rem;
        font-weight: 700;
        color: #f8fafc;
        padding-top: 1rem;
        margin-top: 0.5rem;
        border-top: 2px solid #334155;
      }

      .summary-row strong {
        color: #38bdf8;
        font-size: 1.1rem;
      }

      .summary-row.total-row strong {
        font-size: 1.5rem;
        color: #10b981;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .section-header h3 {
        margin: 0;
      }

      .items-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .order-item-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid #334155;
        border-radius: 0.75rem;
        padding: 1.5rem;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .item-header h4 {
        margin: 0;
        color: #f8fafc;
        font-size: 1rem;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }


      .filters-container {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .pagination-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      .page-info {
        color: #94a3b8;
        font-weight: 600;
      }

      .page-size-label {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: #94a3b8;
        font-size: 0.875rem;
      }

      .page-size-select {
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid #334155;
        background: #020617;
        color: #f8fafc;
      }

      .filter-select,
      .search-input {
        padding: 0.75rem 1rem;
        border: 1px solid #334155;
        border-radius: 0.5rem;
        background: #020617;
        color: #f8fafc;
        font-size: 1rem;
        transition: all 0.2s;
      }

      .filter-select {
        min-width: 180px;
      }

      .search-input {
        min-width: 250px;
      }

      .filter-select:focus,
      .search-input:focus {
        outline: none;
        border-color: #38bdf8;
        box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
      }


      .btn-edit {
        background: #475569;
        color: #f8fafc;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 0.875rem;
        margin-left: 0.5rem;
      }

      .btn-edit:hover {
        background: #64748b;
      }

      .edit-form-cell {
        padding: 1rem !important;
      }

      .edit-order-form {
        background: #1e293b;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #334155;
      }

      .order-id-cell code,
      .customer-id-cell code {
        background: rgba(56, 189, 248, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.875rem;
        color: #38bdf8;
      }

      .status-badge {
        padding: 0.375rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: inline-block;
      }

      .status-pending {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .status-confirmed {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .status-cancelled {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .items-count {
        color: #94a3b8;
        font-size: 0.875rem;
      }

      .total-cell strong {
        color: #10b981;
        font-size: 1.125rem;
      }

      .date-cell {
        color: #94a3b8;
        font-size: 0.875rem;
      }

      .btn-view {
        padding: 0.5rem 1rem;
        background: #334155;
        color: #f8fafc;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
      }

      .btn-view:hover {
        background: #475569;
      }

      .btn-remove {
        padding: 0.5rem 1rem;
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid #ef4444;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
      }

      .btn-remove:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.3);
      }

      .btn-remove:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }


      .success-message {
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: #10b981;
        color: #fff;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .success-message p {
        margin: 0;
        font-weight: 600;
      }

      .btn-close {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-close:hover {
        opacity: 0.8;
      }

      .order-detail-overlay {
        position: fixed;
        inset: 0;
        z-index: 60;
      }

      .overlay-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(2, 6, 23, 0.8);
        backdrop-filter: blur(4px);
      }

      .order-detail-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: min(520px, 100%);
        height: 100%;
        background: #0f172a;
        border-left: 1px solid #1e293b;
        padding: 2rem;
        overflow-y: auto;
        box-shadow: -30px 0 60px rgba(2, 6, 23, 0.6);
      }

      .drawer-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        margin-bottom: 1.5rem;
      }

      .drawer-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.3em;
        font-size: 0.7rem;
        color: #94a3b8;
        margin: 0;
      }

      .drawer-header h2 {
        margin: 0.25rem 0;
        color: #f8fafc;
      }

      .drawer-header p {
        margin: 0;
        color: #94a3b8;
      }

      .drawer-close {
        background: transparent;
        border: 1px solid #334155;
        color: #f8fafc;
        border-radius: 999px;
        width: 36px;
        height: 36px;
        cursor: pointer;
      }

      .detail-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        gap: 1rem;
      }

      .detail-actions {
        display: flex;
        gap: 0.5rem;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .detail-card {
        background: #1e1b4b;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }

      .detail-card .label {
        margin: 0;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
      }

      .detail-card .value {
        margin: 0.35rem 0 0;
        color: #f8fafc;
        font-weight: 600;
      }

      .detail-section {
        margin-bottom: 1.5rem;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        padding-top: 1.5rem;
      }

      .section-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .section-heading h3 {
        margin: 0;
        color: #f8fafc;
      }

      .detail-items {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .detail-item {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }

      .detail-item strong {
        color: #f8fafc;
      }

      .detail-item p {
        margin: 0.25rem 0 0;
        color: #94a3b8;
      }

      .detail-item .value {
        color: #38bdf8;
        font-weight: 700;
      }

      .detail-loading,
      .detail-error {
        background: #1e1b4b;
        border-radius: 0.75rem;
        padding: 1.5rem;
        text-align: center;
        border: 1px solid rgba(148, 163, 184, 0.2);
        margin-bottom: 1rem;
      }

      .detail-alert {
        background: rgba(56, 189, 248, 0.1);
        color: #bae6fd;
        border: 1px solid rgba(56, 189, 248, 0.3);
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        font-size: 0.875rem;
      }

      @media (max-width: 768px) {
        .order-detail-panel {
          width: 100%;
        }
      }

      @media (max-width: 768px) {
        .orders-page {
          padding: 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .filters-container {
          flex-direction: column;
          width: 100%;
        }

        .filter-select,
        .search-input {
          width: 100%;
        }

        .table-container {
          overflow-x: scroll;
        }
      }
    `,
  ],
})
export class OrdersComponent implements OnInit {
  orders$!: Observable<OrderListResponse>;
  form: FormGroup;
  editOrderForm!: FormGroup;
  submitInFlight = signal(false);
  updateInFlight = signal(false);
  editingOrderId = signal<string | null>(null);
  showCreateForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  detailDrawerOpen = signal(false);
  selectedOrder = signal<Order | null>(null);
  orderDetailLoading = signal(false);
  orderDetailError = signal<string | null>(null);
  detailActionMessage = signal<string | null>(null);
  pendingOrderId = signal<string | null>(null);
  statusFilter = signal<string>('');
  customerFilter = signal<string>('');
  page = signal(1);
  pageSize = signal(20);
  readonly pageSizeOptions = [10, 20, 50];
  totalOrders = signal(0);
  ordersInsights = signal({
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    revenue: 0,
    average: 0,
  });
  private statusFilter$ = new BehaviorSubject<string>('');
  private customerFilter$ = new BehaviorSubject<string>('');
  private page$ = new BehaviorSubject<number>(1);
  private pageSize$ = new BehaviorSubject<number>(20);
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  // Customer search
  customerSearchTerm = signal('');
  customerSearchResults = signal<User[]>([]);
  selectedCustomer = signal<User | null>(null);
  showCustomerDropdown = signal(false);
  private customerSearch$ = new BehaviorSubject<string>('');

  // Payment method search
  paymentMethodSearchTerm = signal('');
  paymentMethodSearchResults = signal<PaymentMethod[]>([]);
  selectedPaymentMethod = signal<PaymentMethod | null>(null);
  showPaymentMethodDropdown = signal(false);
  private paymentMethodSearch$ = new BehaviorSubject<string>('');

  // Product search (per item)
  productSearchTerms = signal<Map<number, string>>(new Map());
  productSearchResults = signal<Map<number, Product[]>>(new Map());
  selectedProducts = signal<Map<number, Product>>(new Map());
  showProductDropdown = signal<number | null>(null);
  private productSearchSubjects = new Map<number, BehaviorSubject<string>>();
  private initializedProductSearchIndices = new Set<number>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly orderService: OrderService,
    private readonly userService: UserService,
    private readonly catalogService: CatalogService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly destroyRef: DestroyRef
  ) {
    this.form = this.fb.group({
      customerId: ['', Validators.required],
      paymentMethodId: ['', Validators.required],
      shippingAddress: [''],
      items: this.fb.array([this.createItemGroup()]),
    });

    this.editOrderForm = this.fb.group({
      status: ['', Validators.required],
      shippingAddress: [''],
    });
  }

  ngOnInit(): void {
    this.orders$ = combineLatest([this.page$, this.pageSize$, this.customerFilter$, this.statusFilter$, this.refreshTrigger$]).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap(([page, pageSize, customerId, status, _refresh]) =>
        this.orderService.listOrders(page, pageSize, customerId || undefined).pipe(
          map((response) => {
            const filteredItems = status ? response.items.filter((order) => order.status === status) : response.items;
            return {
              ...response,
              items: filteredItems,
            };
          }),
          catchError((err) => {
            this.error.set(err.error?.detail || 'Failed to load orders');
            return of({
              items: [],
              total: 0,
              page,
              pageSize,
            });
          })
        )
      ),
      tap((response) => {
        this.loading.set(false);
        this.totalOrders.set(response.total);
        const summary = response.items.reduce(
          (acc, order) => {
            acc.revenue += order.total?.amount ?? 0;
            if (order.status === 'PendingPayment') {
              acc.pending += 1;
            } else if (order.status === 'Confirmed') {
              acc.confirmed += 1;
            } else if (order.status === 'Cancelled') {
              acc.cancelled += 1;
            }
            return acc;
          },
          { pending: 0, confirmed: 0, cancelled: 0, revenue: 0 }
        );
        this.ordersInsights.set({
          pending: summary.pending,
          confirmed: summary.confirmed,
          cancelled: summary.cancelled,
          revenue: summary.revenue,
          average: response.items.length ? summary.revenue / response.items.length : 0,
        });
        if (this.page() !== response.page) {
          this.page.set(response.page);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.setupCustomerSearch();
    this.setupPaymentMethodSearch();
    this.loadOrders();
  }

  setupCustomerSearch(): void {
    this.customerSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || term.length < 2) {
            return of([]);
          }
          return this.userService.listUsers(1, 10, undefined, 'Customer').pipe(
            map((response) =>
              response.items.filter(
                (user) =>
                  user.full_name.toLowerCase().includes(term.toLowerCase()) ||
                  user.email.toLowerCase().includes(term.toLowerCase())
              )
            ),
            catchError(() => of([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        this.customerSearchResults.set(results);
      });
  }

  loadOrders(): void {
    this.refreshTrigger$.next(undefined);
  }

  refreshOrders(): void {
    this.loadOrders();
  }

  onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.statusFilter.set(value);
    this.statusFilter$.next(value);
    this.resetPagination();
  }

  onCustomerFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    this.customerFilter.set(value);
    this.customerFilter$.next(value);
    this.resetPagination();
  }

  resetFilters(): void {
    if (!this.statusFilter() && !this.customerFilter()) {
      return;
    }
    this.statusFilter.set('');
    this.customerFilter.set('');
    this.statusFilter$.next('');
    this.customerFilter$.next('');
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
    const target = event.target as HTMLSelectElement;
    const size = Number(target.value);
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
      this.loadOrders();
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PendingPayment':
        return 'Pending Payment';
      case 'Confirmed':
        return 'Confirmed';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      this.items.controls.forEach((control) => {
        Object.keys(control.controls).forEach((key) => {
          control.get(key)?.markAsTouched();
        });
      });
      return;
    }
    this.submitInFlight.set(true);
    this.orderService
      .createOrder({
        customerId: this.form.value.customerId,
        paymentMethodId: this.form.value.paymentMethodId,
        shippingAddress: this.form.value.shippingAddress || undefined,
        items: this.form.value.items.map((item: any) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: { currency: 'USD', amount: Number(item.amount) },
        })),
      })
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.detail || 'Failed to create order');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((order) => {
        if (order) {
          this.successMessage.set(`Order ${order.id.substring(0, 8)}... created successfully!`);
          this.form.reset();
          this.items.clear();
          this.items.push(this.createItemGroup());
          this.showCreateForm.set(false);
          setTimeout(() => this.successMessage.set(null), 5000);
          this.loadOrders();
        }
        this.submitInFlight.set(false);
      });
  }

  cancelCreate(): void {
    this.form.reset();
    this.items.clear();
    this.items.push(this.createItemGroup());
    this.showCreateForm.set(false);
  }

  viewOrder(orderId: string): void {
    this.pendingOrderId.set(orderId);
    this.detailDrawerOpen.set(true);
    this.orderDetailLoading.set(true);
    this.orderDetailError.set(null);
    this.selectedOrder.set(null);

    this.orderService
      .getOrder(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.selectedOrder.set(order);
          this.orderDetailLoading.set(false);
        },
        error: (error) => {
          this.orderDetailError.set(error.error?.detail || 'Unable to load order details.');
          this.orderDetailLoading.set(false);
        },
      });
  }

  closeOrderDetail(): void {
    this.detailDrawerOpen.set(false);
    this.selectedOrder.set(null);
    this.orderDetailError.set(null);
    this.orderDetailLoading.set(false);
    this.pendingOrderId.set(null);
    this.detailActionMessage.set(null);
  }

  retryOrderDetail(): void {
    const orderId = this.pendingOrderId();
    if (!orderId) {
      return;
    }
    this.viewOrder(orderId);
  }

  copyOrderId(orderId: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(orderId)
        .then(() => this.showDetailActionMessage('Order ID copied to clipboard'))
        .catch(() => this.showDetailActionMessage('Unable to copy order ID'));
      return;
    }
    this.showDetailActionMessage('Clipboard not supported in this browser');
  }

  private showDetailActionMessage(message: string): void {
    this.detailActionMessage.set(message);
    setTimeout(() => this.detailActionMessage.set(null), 2500);
  }

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
    });
  }

  // Customer search methods
  onCustomerSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const term = target.value.trim();
    this.customerSearchTerm.set(term);
    this.customerSearch$.next(term);
  }

  selectCustomer(customer: User): void {
    this.selectedCustomer.set(customer);
    this.form.patchValue({ customerId: customer.id });
    this.customerSearchTerm.set('');
    this.showCustomerDropdown.set(false);
    this.customerSearchResults.set([]);
  }

  clearCustomer(): void {
    this.selectedCustomer.set(null);
    this.form.patchValue({ customerId: '' });
    this.customerSearchTerm.set('');
  }

  onCustomerBlur(): void {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      this.showCustomerDropdown.set(false);
    }, 200);
  }

  // Product search methods
  onProductSearch(event: Event, index: number): void {
    const target = event.target as HTMLInputElement;
    const term = target.value.trim();
    const terms = new Map(this.productSearchTerms());
    terms.set(index, term);
    this.productSearchTerms.set(terms);

    if (!this.productSearchSubjects.has(index)) {
      this.productSearchSubjects.set(index, new BehaviorSubject<string>(''));
    }
    if (!this.initializedProductSearchIndices.has(index)) {
      this.setupProductSearch(index);
      this.initializedProductSearchIndices.add(index);
    }
    this.productSearchSubjects.get(index)!.next(term);
  }

  setupProductSearch(index: number): void {
    const subject = this.productSearchSubjects.get(index)!;
    subject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || term.length < 2) {
            return of([]);
          }
          return this.catalogService.listProducts(1, 10, term).pipe(
            map((response) => response.items),
            catchError(() => of([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        const resultsMap = new Map(this.productSearchResults());
        resultsMap.set(index, results);
        this.productSearchResults.set(resultsMap);
      });
  }

  selectProduct(product: Product, index: number): void {
    const selected = new Map(this.selectedProducts());
    selected.set(index, product);
    this.selectedProducts.set(selected);

    const itemControl = this.items.at(index);
    itemControl.patchValue({
      productId: product.id,
      amount: Number(product.price.amount),
    });

    const terms = new Map(this.productSearchTerms());
    terms.set(index, '');
    this.productSearchTerms.set(terms);
    this.showProductDropdown.set(null);
  }

  clearProduct(index: number): void {
    const selected = new Map(this.selectedProducts());
    selected.delete(index);
    this.selectedProducts.set(selected);

    const itemControl = this.items.at(index);
    itemControl.patchValue({
      productId: '',
      amount: 0,
    });

    const terms = new Map(this.productSearchTerms());
    terms.set(index, '');
    this.productSearchTerms.set(terms);
  }

  onProductBlur(index: number): void {
    setTimeout(() => {
      if (this.showProductDropdown() === index) {
        this.showProductDropdown.set(null);
      }
    }, 200);
  }

  getProductSearchTerm(index: number): string {
    return this.productSearchTerms().get(index) || '';
  }

  getProductSearchResults(index: number): Product[] {
    return this.productSearchResults().get(index) || [];
  }

  getSelectedProduct(index: number): Product | undefined {
    return this.selectedProducts().get(index);
  }

  getProductPrice(index: number): number {
    const product = this.getSelectedProduct(index);
    return product ? Number(product.price.amount) : 0;
  }

  // Payment method search methods
  setupPaymentMethodSearch(): void {
    this.paymentMethodSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || term.length < 2) {
            // Return all active payment methods if no search term
            return this.paymentMethodService.listPaymentMethods(true).pipe(
              map((response) => response.items),
              catchError(() => of([]))
            );
          }
          return this.paymentMethodService.listPaymentMethods(true).pipe(
            map((response) =>
              response.items.filter(
                (method) =>
                  method.name.toLowerCase().includes(term.toLowerCase()) ||
                  method.type.toLowerCase().includes(term.toLowerCase())
              )
            ),
            catchError(() => of([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        this.paymentMethodSearchResults.set(results);
      });
  }

  onPaymentMethodSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const term = target.value.trim();
    this.paymentMethodSearchTerm.set(term);
    this.paymentMethodSearch$.next(term);
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod.set(method);
    this.form.patchValue({ paymentMethodId: method.id });
    this.paymentMethodSearchTerm.set('');
    this.showPaymentMethodDropdown.set(false);
  }

  clearPaymentMethod(): void {
    this.selectedPaymentMethod.set(null);
    this.form.patchValue({ paymentMethodId: '' });
    this.paymentMethodSearchTerm.set('');
  }

  onPaymentMethodBlur(): void {
    setTimeout(() => {
      this.showPaymentMethodDropdown.set(false);
    }, 200);
  }

  // Order totals calculation
  getItemSubtotal(index: number): number {
    const itemControl = this.items.at(index);
    const quantity = Number(itemControl.get('quantity')?.value || 0);
    const amount = Number(itemControl.get('amount')?.value || 0);
    return quantity * amount;
  }

  getOrderSubtotal(): number {
    let subtotal = 0;
    for (let i = 0; i < this.items.length; i++) {
      subtotal += this.getItemSubtotal(i);
    }
    return subtotal;
  }

  getOrderTax(): number {
    // For now, no tax calculation. Can be added later based on business rules
    return 0;
  }

  getOrderTotal(): number {
    return this.getOrderSubtotal() + this.getOrderTax();
  }

  // Edit order methods
  startEditOrder(order: Order): void {
    this.editingOrderId.set(order.id);
    this.editOrderForm.patchValue({
      status: order.status,
      shippingAddress: order.shippingAddress || '',
    });
  }

  cancelEditOrder(): void {
    this.editingOrderId.set(null);
    this.editOrderForm.reset();
  }

  updateOrder(orderId: string): void {
    if (this.editOrderForm.invalid) {
      Object.keys(this.editOrderForm.controls).forEach((key) => {
        this.editOrderForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.updateInFlight.set(true);
    this.orderService
      .updateOrder(orderId, {
        status: this.editOrderForm.value.status,
        shippingAddress: this.editOrderForm.value.shippingAddress || undefined,
      })
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.detail || 'Failed to update order');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (order) => {
          if (order) {
            this.editingOrderId.set(null);
            this.editOrderForm.reset();
            this.successMessage.set(`Order ${order.id.substring(0, 8)}... updated successfully!`);
            setTimeout(() => this.successMessage.set(null), 5000);
            this.loadOrders();
          }
          this.updateInFlight.set(false);
        },
        error: () => {
          this.updateInFlight.set(false);
        },
      });
  }
}
