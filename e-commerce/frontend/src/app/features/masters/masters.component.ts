import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { ShippingMethodService } from '../../core/services/shipping-method.service';
import type { Category } from '../../shared/models/category';
import type { PaymentMethod, PaymentMethodType } from '../../shared/models/payment-method';
import type { ShippingMethod } from '../../shared/models/shipping-method';

@Component({
  selector: 'app-masters',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, ReactiveFormsModule, CurrencyPipe],
  template: `
    <div class="masters-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Master Data Management</h1>
          <p class="page-subtitle">Manage categories, payment methods, and shipping methods</p>
        </div>
      </div>

      <div *ngIf="notification()" class="notification" [class.error]="notification()?.type === 'error'">
        <span>{{ notification()?.message }}</span>
        <button class="btn-close" type="button" (click)="dismissNotification()">✕</button>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <p class="summary-label">Categories</p>
          <p class="summary-value">{{ categories().length }}</p>
          <span class="summary-meta">{{ getActiveCount(categories()) }} active</span>
        </div>
        <div class="summary-card">
          <p class="summary-label">Payment Methods</p>
          <p class="summary-value">{{ paymentMethods().length }}</p>
          <span class="summary-meta">{{ getActiveCount(paymentMethods()) }} active</span>
        </div>
        <div class="summary-card">
          <p class="summary-label">Shipping Methods</p>
          <p class="summary-value">{{ shippingMethods().length }}</p>
          <span class="summary-meta">{{ getActiveCount(shippingMethods()) }} active</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab-button"
          [class.active]="activeTab() === 'categories'"
          (click)="activeTab.set('categories')"
        >
          📁 Categories
        </button>
        <button
          class="tab-button"
          [class.active]="activeTab() === 'payment-methods'"
          (click)="activeTab.set('payment-methods')"
        >
          💳 Payment Methods
        </button>
        <button
          class="tab-button"
          [class.active]="activeTab() === 'shipping-methods'"
          (click)="activeTab.set('shipping-methods')"
        >
          🚚 Shipping Methods
        </button>
      </div>

      <!-- Categories Tab -->
      <div *ngIf="activeTab() === 'categories'" class="tab-content">
        <div class="section-header">
          <h2>Categories</h2>
          <button class="btn-primary" (click)="toggleCategoryForm()">
            {{ showCategoryForm() ? 'Cancel' : '+ Add Category' }}
          </button>
        </div>

        <!-- Add Category Form -->
        <div *ngIf="showCategoryForm()" class="form-panel">
          <form [formGroup]="categoryForm" (ngSubmit)="createCategory()">
            <div class="form-grid">
              <label>
                <span>Name *</span>
                <input formControlName="name" type="text" placeholder="Category name" />
                <small *ngIf="categoryForm.get('name')?.invalid && categoryForm.get('name')?.touched">
                  Name is required
                </small>
              </label>
              <label>
                <span>Slug *</span>
                <input formControlName="slug" type="text" placeholder="category-slug" />
                <small *ngIf="categoryForm.get('slug')?.invalid && categoryForm.get('slug')?.touched">
                  Slug is required
                </small>
              </label>
              <label class="full-width">
                <span>Description</span>
                <textarea formControlName="description" placeholder="Category description" rows="3"></textarea>
              </label>
              <label>
                <span>Is Active</span>
                <input formControlName="isActive" type="checkbox" />
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-submit" [disabled]="categoryForm.invalid || categorySubmitting()">
                {{ categorySubmitting() ? 'Creating...' : 'Create Category' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Categories List -->
        <div class="data-panel">
          <div *ngIf="categoriesLoading()" class="loading-state">Loading categories...</div>
          <div *ngIf="!categoriesLoading() && categories().length > 0" class="data-grid">
            <div *ngFor="let category of categories()" class="data-card">
              <div *ngIf="editingCategoryId() !== category.id">
                <div class="card-header">
                  <h3>{{ category.name }}</h3>
                  <span class="badge" [class.active]="category.isActive" [class.inactive]="!category.isActive">
                    {{ category.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <p class="card-slug">Slug: {{ category.slug }}</p>
                <p *ngIf="category.description" class="card-description">{{ category.description }}</p>
                <div class="card-actions">
                  <button class="btn-edit" (click)="startEditCategory(category)">✏️ Edit</button>
                </div>
              </div>
              <div *ngIf="editingCategoryId() === category.id" class="edit-form">
                <form [formGroup]="editCategoryForm" (ngSubmit)="updateCategory(category.id)">
                  <div class="form-grid">
                    <label>
                      <span>Name *</span>
                      <input formControlName="name" type="text" />
                    </label>
                    <label>
                      <span>Slug *</span>
                      <input formControlName="slug" type="text" />
                    </label>
                    <label class="full-width">
                      <span>Description</span>
                      <textarea formControlName="description" rows="3"></textarea>
                    </label>
                    <label>
                      <span>Is Active</span>
                      <input formControlName="isActive" type="checkbox" />
                    </label>
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="btn-submit" [disabled]="editCategoryForm.invalid || categorySubmitting()">
                      {{ categorySubmitting() ? 'Saving...' : 'Save' }}
                    </button>
                    <button type="button" class="btn-cancel" (click)="cancelEditCategory()">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div *ngIf="!categoriesLoading() && categories().length === 0" class="empty-state">
            <p>No categories found. Create one above!</p>
          </div>
        </div>
      </div>

      <!-- Payment Methods Tab -->
      <div *ngIf="activeTab() === 'payment-methods'" class="tab-content">
        <div class="section-header">
          <h2>Payment Methods</h2>
          <button class="btn-primary" (click)="togglePaymentMethodForm()">
            {{ showPaymentMethodForm() ? 'Cancel' : '+ Add Payment Method' }}
          </button>
        </div>

        <!-- Add Payment Method Form -->
        <div *ngIf="showPaymentMethodForm()" class="form-panel">
          <form [formGroup]="paymentMethodForm" (ngSubmit)="createPaymentMethod()">
            <div class="form-grid">
              <label>
                <span>Name *</span>
                <input formControlName="name" type="text" placeholder="Payment method name" />
                <small *ngIf="paymentMethodForm.get('name')?.invalid && paymentMethodForm.get('name')?.touched">
                  Name is required
                </small>
              </label>
              <label>
                <span>Type *</span>
                <select formControlName="type">
                  <option value="">Select type</option>
                  <option value="CreditCard">Credit Card</option>
                  <option value="DebitCard">Debit Card</option>
                  <option value="PayPal">PayPal</option>
                  <option value="BankTransfer">Bank Transfer</option>
                  <option value="CashOnDelivery">Cash on Delivery</option>
                  <option value="DigitalWallet">Digital Wallet</option>
                  <option value="Other">Other</option>
                </select>
                <small *ngIf="paymentMethodForm.get('type')?.invalid && paymentMethodForm.get('type')?.touched">
                  Type is required
                </small>
              </label>
              <label class="full-width">
                <span>Description</span>
                <textarea formControlName="description" placeholder="Payment method description" rows="3"></textarea>
              </label>
              <label>
                <span>Is Active</span>
                <input formControlName="isActive" type="checkbox" />
              </label>
              <label>
                <span>Requires Processing</span>
                <input formControlName="requiresProcessing" type="checkbox" />
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-submit" [disabled]="paymentMethodForm.invalid || paymentMethodSubmitting()">
                {{ paymentMethodSubmitting() ? 'Creating...' : 'Create Payment Method' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Payment Methods List -->
        <div class="data-panel">
          <div *ngIf="paymentMethodsLoading()" class="loading-state">Loading payment methods...</div>
          <div *ngIf="!paymentMethodsLoading() && paymentMethods().length > 0" class="data-grid">
            <div *ngFor="let method of paymentMethods()" class="data-card">
              <div *ngIf="editingPaymentMethodId() !== method.id">
                <div class="card-header">
                  <h3>{{ method.name }}</h3>
                  <span class="badge type-badge">{{ method.type }}</span>
                </div>
                <p class="card-type">Type: {{ method.type }}</p>
                <p *ngIf="method.description" class="card-description">{{ method.description }}</p>
                <div class="card-footer">
                  <span class="badge" [class.active]="method.isActive" [class.inactive]="!method.isActive">
                    {{ method.isActive ? 'Active' : 'Inactive' }}
                  </span>
                  <span *ngIf="method.requiresProcessing" class="badge processing">Requires Processing</span>
                </div>
                <div class="card-actions">
                  <button class="btn-edit" (click)="startEditPaymentMethod(method)">✏️ Edit</button>
                </div>
              </div>
              <div *ngIf="editingPaymentMethodId() === method.id" class="edit-form">
                <form [formGroup]="editPaymentMethodForm" (ngSubmit)="updatePaymentMethod(method.id)">
                  <div class="form-grid">
                    <label>
                      <span>Name *</span>
                      <input formControlName="name" type="text" />
                    </label>
                    <label>
                      <span>Type *</span>
                      <select formControlName="type">
                        <option *ngFor="let type of paymentMethodTypes" [value]="type">{{ type }}</option>
                      </select>
                    </label>
                    <label class="full-width">
                      <span>Description</span>
                      <textarea formControlName="description" rows="3"></textarea>
                    </label>
                    <label>
                      <span>Is Active</span>
                      <input formControlName="isActive" type="checkbox" />
                    </label>
                    <label>
                      <span>Requires Processing</span>
                      <input formControlName="requiresProcessing" type="checkbox" />
                    </label>
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="btn-submit" [disabled]="editPaymentMethodForm.invalid || paymentMethodSubmitting()">
                      {{ paymentMethodSubmitting() ? 'Saving...' : 'Save' }}
                    </button>
                    <button type="button" class="btn-cancel" (click)="cancelEditPaymentMethod()">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div *ngIf="!paymentMethodsLoading() && paymentMethods().length === 0" class="empty-state">
            <p>No payment methods found. Create one above!</p>
          </div>
        </div>
      </div>

      <!-- Shipping Methods Tab -->
      <div *ngIf="activeTab() === 'shipping-methods'" class="tab-content">
        <div class="section-header">
          <h2>Shipping Methods</h2>
          <button class="btn-primary" (click)="toggleShippingMethodForm()">
            {{ showShippingMethodForm() ? 'Cancel' : '+ Add Shipping Method' }}
          </button>
        </div>

        <!-- Add Shipping Method Form -->
        <div *ngIf="showShippingMethodForm()" class="form-panel">
          <form [formGroup]="shippingMethodForm" (ngSubmit)="createShippingMethod()">
            <div class="form-grid">
              <label>
                <span>Name *</span>
                <input formControlName="name" type="text" placeholder="Shipping method name" />
                <small *ngIf="shippingMethodForm.get('name')?.invalid && shippingMethodForm.get('name')?.touched">
                  Name is required
                </small>
              </label>
              <label>
                <span>Base Cost (₹) *</span>
                <input formControlName="baseCostAmount" type="number" step="0.01" min="0" placeholder="0.00" />
                <small *ngIf="shippingMethodForm.get('baseCostAmount')?.invalid && shippingMethodForm.get('baseCostAmount')?.touched">
                  Base cost is required
                </small>
              </label>
              <label>
                <span>Min Days</span>
                <input formControlName="estimatedDaysMin" type="number" min="0" placeholder="1" />
              </label>
              <label>
                <span>Max Days</span>
                <input formControlName="estimatedDaysMax" type="number" min="0" placeholder="7" />
              </label>
              <label class="full-width">
                <span>Description</span>
                <textarea formControlName="description" placeholder="Shipping method description" rows="3"></textarea>
              </label>
              <label>
                <span>Is Active</span>
                <input formControlName="isActive" type="checkbox" />
              </label>
              <label>
                <span>Is Express</span>
                <input formControlName="isExpress" type="checkbox" />
              </label>
              <label>
                <span>Requires Signature</span>
                <input formControlName="requiresSignature" type="checkbox" />
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-submit" [disabled]="shippingMethodForm.invalid || shippingMethodSubmitting()">
                {{ shippingMethodSubmitting() ? 'Creating...' : 'Create Shipping Method' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Shipping Methods List -->
        <div class="data-panel">
          <div *ngIf="shippingMethodsLoading()" class="loading-state">Loading shipping methods...</div>
          <div *ngIf="!shippingMethodsLoading() && shippingMethods().length > 0" class="data-grid">
            <div *ngFor="let method of shippingMethods()" class="data-card">
              <div *ngIf="editingShippingMethodId() !== method.id">
                <div class="card-header">
                  <h3>{{ method.name }}</h3>
                  <span class="badge" [class.express]="method.isExpress">
                    {{ method.isExpress ? 'Express' : 'Standard' }}
                  </span>
                </div>
                <p class="card-cost">
                  Base Cost: {{ method.baseCost.amount | currency : (method.baseCost.currency || 'INR') : 'symbol' : '1.2-2' }}
                </p>
                <p *ngIf="method.estimatedDaysMin && method.estimatedDaysMax" class="card-days">
                  Estimated: {{ method.estimatedDaysMin }}-{{ method.estimatedDaysMax }} days
                </p>
                <p *ngIf="method.description" class="card-description">{{ method.description }}</p>
                <div class="card-footer">
                  <span class="badge" [class.active]="method.isActive" [class.inactive]="!method.isActive">
                    {{ method.isActive ? 'Active' : 'Inactive' }}
                  </span>
                  <span *ngIf="method.requiresSignature" class="badge signature">Requires Signature</span>
                </div>
                <div class="card-actions">
                  <button class="btn-edit" (click)="startEditShippingMethod(method)">✏️ Edit</button>
                </div>
              </div>
              <div *ngIf="editingShippingMethodId() === method.id" class="edit-form">
                <form [formGroup]="editShippingMethodForm" (ngSubmit)="updateShippingMethod(method.id)">
                  <div class="form-grid">
                    <label>
                      <span>Name *</span>
                      <input formControlName="name" type="text" />
                    </label>
                    <label>
                      <span>Base Cost (₹) *</span>
                      <input formControlName="baseCostAmount" type="number" step="0.01" min="0" />
                    </label>
                    <label>
                      <span>Min Days</span>
                      <input formControlName="estimatedDaysMin" type="number" min="0" />
                    </label>
                    <label>
                      <span>Max Days</span>
                      <input formControlName="estimatedDaysMax" type="number" min="0" />
                    </label>
                    <label class="full-width">
                      <span>Description</span>
                      <textarea formControlName="description" rows="3"></textarea>
                    </label>
                    <label>
                      <span>Is Active</span>
                      <input formControlName="isActive" type="checkbox" />
                    </label>
                    <label>
                      <span>Is Express</span>
                      <input formControlName="isExpress" type="checkbox" />
                    </label>
                    <label>
                      <span>Requires Signature</span>
                      <input formControlName="requiresSignature" type="checkbox" />
                    </label>
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="btn-submit" [disabled]="editShippingMethodForm.invalid || shippingMethodSubmitting()">
                      {{ shippingMethodSubmitting() ? 'Saving...' : 'Save' }}
                    </button>
                    <button type="button" class="btn-cancel" (click)="cancelEditShippingMethod()">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div *ngIf="!shippingMethodsLoading() && shippingMethods().length === 0" class="empty-state">
            <p>No shipping methods found. Create one above!</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .masters-page {
        padding: 2rem;
        max-width: 1600px;
        margin: 0 auto;
      }

      .page-header {
        margin-bottom: 2rem;
      }

      .page-header h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2.5rem;
        font-weight: 800;
        color: var(--premium-onyx);
      }

      .page-subtitle {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 1.125rem;
      }

      .notification {
        margin: 1rem 0;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        background: rgba(183, 110, 121, 0.12);
        color: var(--premium-rose-gold);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        border: 1px solid rgba(183, 110, 121, 0.3);
      }

      .notification.error {
        background: rgba(231, 70, 70, 0.12);
        color: #b42318;
        border-color: rgba(231, 70, 70, 0.4);
      }

      .btn-close {
        background: transparent;
        border: none;
        color: inherit;
        font-size: 1.25rem;
        cursor: pointer;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0 2rem;
      }

      .summary-card {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
      }

      .summary-label {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 0.85rem;
        text-transform: uppercase;
      }

      .summary-value {
        margin: 0.25rem 0 0;
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--premium-onyx);
      }

      .summary-meta {
        color: var(--premium-titanium);
        font-size: 0.9rem;
      }

      /* Tabs */
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 2rem;
        border-bottom: 2px solid var(--premium-silver);
      }

      .tab-button {
        padding: 1rem 2rem;
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        color: var(--premium-titanium);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: -2px;
      }

      .tab-button:hover {
        color: var(--premium-onyx);
        background: var(--premium-moonstone);
      }

      .tab-button.active {
        color: var(--premium-rose-gold);
        border-bottom-color: var(--premium-rose-gold);
      }

      .tab-content {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .section-header h2 {
        margin: 0;
        font-size: 1.75rem;
        color: var(--premium-onyx);
        font-weight: 700;
      }

      .btn-primary {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
      }

      .btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      /* Forms */
      .form-panel {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        margin-bottom: 2rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-weight: 500;
        color: var(--premium-onyx);
        font-size: 0.9rem;
      }

      input[type='text'],
      input[type='number'],
      select,
      textarea {
        padding: 0.75rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
        outline: none;
        transition: all 0.2s;
      }

      input[type='checkbox'] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }

      input:focus,
      select:focus,
      textarea:focus {
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      textarea {
        resize: vertical;
        min-height: 80px;
      }

      small {
        color: #ef4444;
        font-size: 0.75rem;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }

      .btn-submit {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        padding: 0.75rem 2rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
      }

      .btn-submit:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Data Panel */
      .data-panel {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }

      .loading-state,
      .empty-state {
        text-align: center;
        padding: 3rem;
        color: var(--premium-titanium);
      }

      .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      .data-card {
        background: #fff;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid var(--premium-silver);
        transition: all 0.2s;
        box-shadow: 0 10px 30px var(--premium-shadow);
      }

      .data-card:hover {
        border-color: var(--premium-rose-gold);
        transform: translateY(-2px);
        box-shadow: 0 20px 40px rgba(183, 110, 121, 0.2);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .card-header h3 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--premium-onyx);
        font-weight: 600;
      }

      .card-slug,
      .card-type,
      .card-cost,
      .card-days {
        margin: 0.5rem 0;
        color: var(--premium-titanium);
        font-size: 0.875rem;
      }

      .card-description {
        margin: 1rem 0;
        color: var(--premium-onyx);
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .card-footer {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
        flex-wrap: wrap;
      }

      .badge {
        padding: 0.4rem 0.8rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;
      }

      .badge.active {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .badge.inactive {
        background: rgba(148, 163, 184, 0.2);
        color: #94a3b8;
      }

      .badge.type-badge {
        background: rgba(183, 110, 121, 0.12);
        color: var(--premium-rose-gold);
      }

      .badge.express {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .badge.processing {
        background: rgba(139, 92, 246, 0.2);
        color: #8b5cf6;
      }

      .badge.signature {
        background: rgba(236, 72, 153, 0.2);
        color: #ec4899;
      }

      .card-actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.5rem;
      }

      .btn-edit {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        padding: 0.5rem 1rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
      }

      .btn-edit:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }

      .edit-form {
        margin-top: 1rem;
        padding: 1rem;
        background: var(--premium-moonstone);
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
      }

      .btn-cancel {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        padding: 0.75rem 1.5rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-cancel:hover {
        background: #475569;
      }

      @media (max-width: 768px) {
        .masters-page {
          padding: 1rem;
        }

        .tabs {
          flex-wrap: wrap;
        }

        .tab-button {
          flex: 1;
          min-width: 120px;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .data-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MastersComponent implements OnInit {
  activeTab = signal<'categories' | 'payment-methods' | 'shipping-methods'>('categories');
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private notificationTimeout: ReturnType<typeof setTimeout> | null = null;

  // Categories
  categories = signal<Category[]>([]);
  categoriesLoading = signal(false);
  showCategoryForm = signal(false);
  categorySubmitting = signal(false);
  categoryForm: FormGroup;
  editingCategoryId = signal<string | null>(null);
  editCategoryForm: FormGroup;

  // Payment Methods
  paymentMethods = signal<PaymentMethod[]>([]);
  paymentMethodsLoading = signal(false);
  showPaymentMethodForm = signal(false);
  paymentMethodSubmitting = signal(false);
  paymentMethodForm: FormGroup;
  editingPaymentMethodId = signal<string | null>(null);
  editPaymentMethodForm: FormGroup;
  paymentMethodTypes = ['CreditCard', 'DebitCard', 'PayPal', 'BankTransfer', 'CashOnDelivery', 'DigitalWallet', 'Other'];

  // Shipping Methods
  shippingMethods = signal<ShippingMethod[]>([]);
  shippingMethodsLoading = signal(false);
  showShippingMethodForm = signal(false);
  shippingMethodSubmitting = signal(false);
  shippingMethodForm: FormGroup;
  editingShippingMethodId = signal<string | null>(null);
  editShippingMethodForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly categoryService: CategoryService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly shippingMethodService: ShippingMethodService
  ) {
    // Category form
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: [''],
      isActive: [true],
    });

    // Payment method form
    this.paymentMethodForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      description: [''],
      isActive: [true],
      requiresProcessing: [false],
    });

    // Shipping method form
    this.shippingMethodForm = this.fb.group({
      name: ['', Validators.required],
      baseCostAmount: [0, [Validators.required, Validators.min(0)]],
      estimatedDaysMin: [null],
      estimatedDaysMax: [null],
      description: [''],
      isActive: [true],
      isExpress: [false],
      requiresSignature: [false],
    });

    // Edit forms
    this.editCategoryForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: [''],
      isActive: [true],
    });

    this.editPaymentMethodForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      description: [''],
      isActive: [true],
      requiresProcessing: [false],
    });

    this.editShippingMethodForm = this.fb.group({
      name: ['', Validators.required],
      baseCostAmount: [0, [Validators.required, Validators.min(0)]],
      estimatedDaysMin: [null],
      estimatedDaysMax: [null],
      description: [''],
      isActive: [true],
      isExpress: [false],
      requiresSignature: [false],
    });
  }

  ngOnInit(): void {
    this.loadAllMasters();
  }

  loadAllMasters(): void {
    this.loadCategories();
    this.loadPaymentMethods();
    this.loadShippingMethods();
  }

  // Categories
  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoryService
      .listCategories() // Load all categories (active and inactive)
      .pipe(
        catchError((error) => {
          console.error('Failed to load categories:', error);
          return of({ items: [], total: 0, page: 1, pageSize: 100 });
        })
      )
      .subscribe((response) => {
        this.categories.set(response.items);
        this.categoriesLoading.set(false);
      });
  }

  toggleCategoryForm(): void {
    this.showCategoryForm.update((val) => !val);
    if (!this.showCategoryForm()) {
      this.categoryForm.reset({ isActive: true });
    }
  }

  createCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.categorySubmitting.set(true);
    this.categoryService
      .createCategory({
        name: this.categoryForm.value.name,
        slug: this.categoryForm.value.slug,
        description: this.categoryForm.value.description || undefined,
        parentId: undefined,
        isActive: this.categoryForm.value.isActive ?? true,
      })
      .pipe(
        catchError((error) => {
          console.error('Failed to create category:', error);
          this.showNotification('error', error.error?.detail || 'Failed to create category');
          return of(null);
        })
      )
      .subscribe((category) => {
        this.categorySubmitting.set(false);
        if (category) {
          this.showCategoryForm.set(false);
          this.categoryForm.reset({ isActive: true });
          this.loadCategories();
          this.showNotification('success', 'Category created successfully.');
        }
      });
  }

  startEditCategory(category: Category): void {
    this.editingCategoryId.set(category.id);
    this.editCategoryForm.patchValue({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      isActive: category.isActive,
    });
  }

  cancelEditCategory(): void {
    this.editingCategoryId.set(null);
    this.editCategoryForm.reset({ isActive: true });
  }

  updateCategory(categoryId: string): void {
    if (this.editCategoryForm.invalid) {
      this.editCategoryForm.markAllAsTouched();
      return;
    }

    this.categorySubmitting.set(true);
    this.categoryService
      .updateCategory(categoryId, {
        name: this.editCategoryForm.value.name,
        slug: this.editCategoryForm.value.slug,
        description: this.editCategoryForm.value.description || undefined,
        isActive: this.editCategoryForm.value.isActive,
      })
      .pipe(
        catchError((error) => {
          console.error('Failed to update category:', error);
          this.showNotification('error', error.error?.detail || 'Failed to update category');
          return of(null);
        })
      )
      .subscribe((category) => {
        this.categorySubmitting.set(false);
        if (category) {
          this.editingCategoryId.set(null);
          this.editCategoryForm.reset({ isActive: true });
          this.loadCategories();
          this.showNotification('success', 'Category updated successfully.');
        }
      });
  }

  // Payment Methods
  loadPaymentMethods(): void {
    this.paymentMethodsLoading.set(true);
    this.paymentMethodService
      .listPaymentMethods() // Load all payment methods (active and inactive)
      .pipe(
        catchError((error) => {
          console.error('Failed to load payment methods:', error);
          return of({ items: [], total: 0, page: 1, pageSize: 100 });
        })
      )
      .subscribe((response) => {
        this.paymentMethods.set(response.items);
        this.paymentMethodsLoading.set(false);
      });
  }

  togglePaymentMethodForm(): void {
    this.showPaymentMethodForm.update((val) => !val);
    if (!this.showPaymentMethodForm()) {
      this.paymentMethodForm.reset({ isActive: true, requiresProcessing: false });
    }
  }

  createPaymentMethod(): void {
    if (this.paymentMethodForm.invalid) {
      this.paymentMethodForm.markAllAsTouched();
      return;
    }

    this.paymentMethodSubmitting.set(true);
    this.paymentMethodService
      .createPaymentMethod({
        name: this.paymentMethodForm.value.name,
        type: this.paymentMethodForm.value.type,
        description: this.paymentMethodForm.value.description || undefined,
        isActive: this.paymentMethodForm.value.isActive ?? true,
        requiresProcessing: this.paymentMethodForm.value.requiresProcessing ?? false,
      })
      .pipe(
        catchError((error) => {
          console.error('Failed to create payment method:', error);
          this.showNotification('error', error.error?.detail || 'Failed to create payment method');
          return of(null);
        })
      )
      .subscribe((method) => {
        this.paymentMethodSubmitting.set(false);
        if (method) {
          this.showPaymentMethodForm.set(false);
          this.paymentMethodForm.reset({ isActive: true, requiresProcessing: false });
          this.loadPaymentMethods();
          this.showNotification('success', 'Payment method created successfully.');
        }
      });
  }

  startEditPaymentMethod(method: PaymentMethod): void {
    this.editingPaymentMethodId.set(method.id);
    this.editPaymentMethodForm.patchValue({
      name: method.name,
      type: method.type,
      description: method.description || '',
      isActive: method.isActive,
      requiresProcessing: method.requiresProcessing,
    });
  }

  cancelEditPaymentMethod(): void {
    this.editingPaymentMethodId.set(null);
    this.editPaymentMethodForm.reset({ isActive: true, requiresProcessing: false });
  }

  updatePaymentMethod(paymentMethodId: string): void {
    if (this.editPaymentMethodForm.invalid) {
      this.editPaymentMethodForm.markAllAsTouched();
      return;
    }

    this.paymentMethodSubmitting.set(true);
    this.paymentMethodService
      .updatePaymentMethod(paymentMethodId, {
        name: this.editPaymentMethodForm.value.name,
        type: this.editPaymentMethodForm.value.type,
        description: this.editPaymentMethodForm.value.description || undefined,
        isActive: this.editPaymentMethodForm.value.isActive,
        requiresProcessing: this.editPaymentMethodForm.value.requiresProcessing,
      })
      .pipe(
        catchError((error) => {
          console.error('Failed to update payment method:', error);
          this.showNotification('error', error.error?.detail || 'Failed to update payment method');
          return of(null);
        })
      )
      .subscribe((method) => {
        this.paymentMethodSubmitting.set(false);
        if (method) {
          this.editingPaymentMethodId.set(null);
          this.editPaymentMethodForm.reset({ isActive: true, requiresProcessing: false });
          this.loadPaymentMethods();
          this.showNotification('success', 'Payment method updated successfully.');
        }
      });
  }

  // Shipping Methods
  loadShippingMethods(): void {
    this.shippingMethodsLoading.set(true);
    this.shippingMethodService
      .listShippingMethods() // Load all shipping methods (active and inactive)
      .pipe(
        catchError((error) => {
          console.error('Failed to load shipping methods:', error);
          return of({ items: [], total: 0, page: 1, pageSize: 100 });
        })
      )
      .subscribe((response) => {
        this.shippingMethods.set(response.items);
        this.shippingMethodsLoading.set(false);
      });
  }

  toggleShippingMethodForm(): void {
    this.showShippingMethodForm.update((val) => !val);
    if (!this.showShippingMethodForm()) {
      this.shippingMethodForm.reset({ isActive: true, isExpress: false, requiresSignature: false, baseCostAmount: 0 });
    }
  }

  createShippingMethod(): void {
    if (this.shippingMethodForm.invalid) {
      this.shippingMethodForm.markAllAsTouched();
      return;
    }

    this.shippingMethodSubmitting.set(true);
    this.shippingMethodService
      .createShippingMethod({
        name: this.shippingMethodForm.value.name,
        description: this.shippingMethodForm.value.description || undefined,
        estimatedDaysMin: this.shippingMethodForm.value.estimatedDaysMin || undefined,
        estimatedDaysMax: this.shippingMethodForm.value.estimatedDaysMax || undefined,
        baseCost: {
          currency: 'INR',
          amount: Number(this.shippingMethodForm.value.baseCostAmount),
        },
        isActive: this.shippingMethodForm.value.isActive ?? true,
        requiresSignature: this.shippingMethodForm.value.requiresSignature ?? false,
        isExpress: this.shippingMethodForm.value.isExpress ?? false,
      })
      .pipe(
        catchError((error) => {
          console.error('Failed to create shipping method:', error);
          this.showNotification('error', error.error?.detail || 'Failed to create shipping method');
          return of(null);
        })
      )
      .subscribe((method: ShippingMethod | null) => {
        this.shippingMethodSubmitting.set(false);
        if (method) {
          this.showShippingMethodForm.set(false);
          this.shippingMethodForm.reset({ isActive: true, isExpress: false, requiresSignature: false, baseCostAmount: 0 });
          this.loadShippingMethods();
          this.showNotification('success', 'Shipping method created successfully.');
        }
      });
  }

  startEditShippingMethod(method: ShippingMethod): void {
    this.editingShippingMethodId.set(method.id);
    this.editShippingMethodForm.patchValue({
      name: method.name,
      description: method.description || '',
      estimatedDaysMin: method.estimatedDaysMin || null,
      estimatedDaysMax: method.estimatedDaysMax || null,
      baseCostAmount: method.baseCost?.amount || 0,
      isActive: method.isActive ?? true,
      requiresSignature: method.requiresSignature ?? false,
      isExpress: method.isExpress ?? false,
    });
  }

  cancelEditShippingMethod(): void {
    this.editingShippingMethodId.set(null);
    this.editShippingMethodForm.reset({
      isActive: true,
      isExpress: false,
      requiresSignature: false,
      baseCostAmount: 0,
      estimatedDaysMin: null,
      estimatedDaysMax: null,
      description: '',
      name: '',
    });
  }

  updateShippingMethod(shippingMethodId: string): void {
    if (this.editShippingMethodForm.invalid) {
      this.editShippingMethodForm.markAllAsTouched();
      return;
    }

    this.shippingMethodSubmitting.set(true);
    this.shippingMethodService
      .updateShippingMethod(shippingMethodId, {
        name: this.editShippingMethodForm.value.name,
        description: this.editShippingMethodForm.value.description || undefined,
        estimatedDaysMin: this.editShippingMethodForm.value.estimatedDaysMin || undefined,
        estimatedDaysMax: this.editShippingMethodForm.value.estimatedDaysMax || undefined,
        baseCost: {
          currency: 'INR',
          amount: Number(this.editShippingMethodForm.value.baseCostAmount),
        },
        isActive: this.editShippingMethodForm.value.isActive ?? true,
        requiresSignature: this.editShippingMethodForm.value.requiresSignature ?? false,
        isExpress: this.editShippingMethodForm.value.isExpress ?? false,
      })
      .pipe(
        catchError((error) => {
          console.error('Failed to update shipping method:', error);
          this.showNotification('error', error.error?.detail || 'Failed to update shipping method');
          return of(null);
        })
      )
      .subscribe((method: ShippingMethod | null) => {
        this.shippingMethodSubmitting.set(false);
        if (method) {
          this.editingShippingMethodId.set(null);
          this.editShippingMethodForm.reset({
            isActive: true,
            isExpress: false,
            requiresSignature: false,
            baseCostAmount: 0,
            estimatedDaysMin: null,
            estimatedDaysMax: null,
            description: '',
            name: '',
          });
          this.loadShippingMethods();
          this.showNotification('success', 'Shipping method updated successfully.');
        }
      });
  }

  dismissNotification(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
    this.notification.set(null);
  }

  getActiveCount(items: Array<{ isActive?: boolean }>): number {
    return items.filter((item) => item.isActive !== false).length;
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.notification.set(null);
      this.notificationTimeout = null;
    }, 5000);
  }
}

