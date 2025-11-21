import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { finalize, map, shareReplay, startWith, switchMap, tap } from 'rxjs';

import { CatalogService } from '../../core/services/catalog.service';
import { CategoryService } from '../../core/services/category.service';
import { DiscountService } from '../../core/services/discount.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import type { Category } from '../../shared/models/category';
import type { Product } from '../../shared/models/catalog';
import type {
  CreateDiscountRequest,
  Discount,
  DiscountListResponse,
  DiscountScope,
  DiscountStatus,
  DiscountType,
  UpdateDiscountRequest,
} from '../../shared/models/discount';

type DiscountStatusFilter = 'all' | DiscountStatus;

interface DiscountViewModel {
  items: Discount[];
  total: number;
  filteredTotal: number;
  stats: {
    active: number;
    inactive: number;
    expired: number;
  };
}

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, DatePipe, CurrencyPipe, ReactiveFormsModule, ModalComponent],
  template: `
    <section class="panel">
      <header class="panel__header">
        <div>
          <h2>Discounts & Promotions</h2>
          <p>Manage discount codes, coupons, and promotional offers.</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" type="button" (click)="refreshDiscounts()" [disabled]="discountsLoading()">
            Refresh
          </button>
          <button class="btn-primary" type="button" (click)="showCreateForm.set(true)">+ New Discount</button>
        </div>
      </header>

      <form [formGroup]="filterForm" class="filters">
        <label class="search-field">
          <span>Search</span>
          <input type="search" formControlName="search" placeholder="Search by code, name, or description" />
        </label>
        <div class="status-pills">
          <button
            type="button"
            [class.active]="filterForm.get('status')?.value === 'all'"
            (click)="setStatusFilter('all')"
          >
            All
          </button>
          <button
            type="button"
            [class.active]="filterForm.get('status')?.value === 'Active'"
            (click)="setStatusFilter('Active')"
          >
            Active
          </button>
          <button
            type="button"
            [class.active]="filterForm.get('status')?.value === 'Inactive'"
            (click)="setStatusFilter('Inactive')"
          >
            Inactive
          </button>
          <button
            type="button"
            [class.active]="filterForm.get('status')?.value === 'Expired'"
            (click)="setStatusFilter('Expired')"
          >
            Expired
          </button>
        </div>
      </form>

      <ng-container *ngIf="discountsView$ | async as vm">
        <div class="discount-stats">
          <div class="stat-card">
            <span class="label">Total discounts</span>
            <strong>{{ vm.total }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Active</span>
            <strong>{{ vm.stats.active }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Inactive</span>
            <strong>{{ vm.stats.inactive }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Expired</span>
            <strong>{{ vm.stats.expired }}</strong>
          </div>
          <div class="stat-card">
            <span class="label">Showing</span>
            <strong>{{ vm.filteredTotal }}</strong>
          </div>
        </div>

        <div class="discounts-layout">
          <div class="table-wrapper">
            <div *ngIf="discountsLoading()" class="inline-loading">
              <div class="spinner"></div>
              <p>Loading discounts...</p>
            </div>

            <table *ngIf="vm.items.length > 0">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Uses</th>
                  <th>Valid Until</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let discount of vm.items" (click)="selectDiscount(discount)" [class.selected]="isSelected(discount)">
                  <td>
                    <code>{{ discount.code }}</code>
                  </td>
                  <td>
                    <strong>{{ discount.name }}</strong>
                    <small *ngIf="discount.description">{{ discount.description }}</small>
                  </td>
                  <td>
                    <span class="badge badge-type">{{ discount.discountType }}</span>
                  </td>
                  <td>
                    <span *ngIf="discount.discountType === 'Percentage'">{{ discount.discountValue }}%</span>
                    <span *ngIf="discount.discountType === 'FixedAmount'">
                      {{ discount.discountValue | currency : (discount.discountCurrency || 'INR') : 'symbol' : '1.2-2' }}
                    </span>
                    <span *ngIf="discount.discountType === 'FreeShipping'">Free Shipping</span>
                  </td>
                  <td>
                    <span class="badge badge-scope">{{ discount.scope }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-active]="discount.status === 'Active'"
                      [class.badge-inactive]="discount.status === 'Inactive'"
                      [class.badge-expired]="discount.status === 'Expired'"
                    >
                      {{ discount.status }}
                    </span>
                  </td>
                  <td>
                    {{ discount.currentUses }}
                    <span *ngIf="discount.maxUses">/ {{ discount.maxUses }}</span>
                  </td>
                  <td>
                    <span *ngIf="discount.validUntil">{{ discount.validUntil | date : 'short' }}</span>
                    <span *ngIf="!discount.validUntil">No expiry</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="!discountsLoading() && vm.items.length === 0">
              <div class="empty-icon">🎟️</div>
              <h3>No discounts match your filters</h3>
              <p>Try clearing the search or switch the status filter.</p>
              <button class="btn-secondary" type="button" (click)="setStatusFilter('all')">Reset filters</button>
            </div>
          </div>

          <aside class="discount-detail" *ngIf="selectedDiscount() as discount">
            <header class="detail-header">
              <div>
                <p class="detail-eyebrow">Discount detail</p>
                <h3>{{ discount.name }}</h3>
                <p><code>{{ discount.code }}</code></p>
              </div>
              <div class="header-actions">
                <button class="btn-primary" type="button" (click)="startEdit(discount)" *ngIf="!editingDiscountId()">Edit</button>
                <button class="btn-secondary" type="button" (click)="closeDiscountDetail()">Close</button>
              </div>
            </header>

            <dl>
              <div>
                <dt>Type</dt>
                <dd>
                  <span class="badge badge-type">{{ discount.discountType }}</span>
                </dd>
              </div>
              <div>
                <dt>Value</dt>
                <dd>
                  <span *ngIf="discount.discountType === 'Percentage'">{{ discount.discountValue }}%</span>
                  <span *ngIf="discount.discountType === 'FixedAmount'">
                    {{ discount.discountValue | currency : (discount.discountCurrency || 'INR') : 'symbol' : '1.2-2' }}
                  </span>
                  <span *ngIf="discount.discountType === 'FreeShipping'">Free Shipping</span>
                </dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>
                  <span class="badge badge-scope">{{ discount.scope }}</span>
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    class="badge"
                    [class.badge-active]="discount.status === 'Active'"
                    [class.badge-inactive]="discount.status === 'Inactive'"
                    [class.badge-expired]="discount.status === 'Expired'"
                  >
                    {{ discount.status }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Valid From</dt>
                <dd>{{ discount.validFrom | date : 'medium' }}</dd>
              </div>
              <div *ngIf="discount.validUntil">
                <dt>Valid Until</dt>
                <dd>{{ discount.validUntil | date : 'medium' }}</dd>
              </div>
              <div>
                <dt>Usage</dt>
                <dd>
                  {{ discount.currentUses }}
                  <span *ngIf="discount.maxUses">of {{ discount.maxUses }}</span>
                </dd>
              </div>
              <div *ngIf="discount.minimumOrderAmount">
                <dt>Minimum Order</dt>
                <dd>{{ discount.minimumOrderAmount | currency : (discount.minimumOrderCurrency || 'INR') : 'symbol' : '1.2-2' }}</dd>
              </div>
              <div *ngIf="discount.description">
                <dt>Description</dt>
                <dd>{{ discount.description }}</dd>
              </div>
            </dl>

            <div class="detail-toast" *ngIf="discountActionMessage()">
              {{ discountActionMessage() }}
            </div>
          </aside>
        </div>
      </ng-container>
    </section>

    <!-- Create Discount Modal -->
    <app-modal [isOpen]="showCreateForm()" title="Create New Discount" (closeModal)="cancelCreate()">
      <form [formGroup]="createForm" (ngSubmit)="createDiscount()">
        <div class="form-row">
          <label>
            <span>Code <span class="required">*</span></span>
            <input formControlName="code" type="text" placeholder="SAVE20" />
            <small *ngIf="createForm.get('code')?.invalid && createForm.get('code')?.touched">
              Code is required (3-64 characters, alphanumeric).
            </small>
          </label>
          <label>
            <span>Name <span class="required">*</span></span>
            <input formControlName="name" type="text" placeholder="20% Off Sale" />
            <small *ngIf="createForm.get('name')?.invalid && createForm.get('name')?.touched">Name is required.</small>
          </label>
        </div>

        <label>
          <span>Description</span>
          <textarea formControlName="description" rows="3" placeholder="Discount description"></textarea>
        </label>

        <div class="form-row">
          <label>
            <span>Discount Type <span class="required">*</span></span>
            <select formControlName="discountType">
              <option value="Percentage">Percentage</option>
              <option value="FixedAmount">Fixed Amount</option>
              <option value="FreeShipping">Free Shipping</option>
            </select>
          </label>
          <label *ngIf="createForm.get('discountType')?.value !== 'FreeShipping'">
            <span>Discount Value <span class="required">*</span></span>
            <input formControlName="discountValue" type="number" step="0.01" placeholder="20" />
            <small *ngIf="createForm.get('discountValue')?.invalid && createForm.get('discountValue')?.touched">
              Value is required.
            </small>
          </label>
          <label *ngIf="createForm.get('discountType')?.value === 'FixedAmount'">
            <span>Currency</span>
            <input formControlName="discountCurrency" type="text" maxlength="3" placeholder="INR" />
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Scope <span class="required">*</span></span>
            <select formControlName="scope">
              <option value="Order">Order</option>
              <option value="Cart">Cart</option>
              <option value="Product">Product</option>
              <option value="Category">Category</option>
            </select>
          </label>
          <label *ngIf="createForm.get('scope')?.value === 'Product'" class="product-select-wrapper">
            <span>Products <span class="required">*</span></span>
            <div class="searchable-select">
              <input
                type="text"
                [value]="productSearchTerm()"
                (focus)="onProductInputFocus()"
                (input)="onProductSearch($event)"
                placeholder="Search products..."
                class="product-search-input"
              />
              <div class="selected-products" *ngIf="getSelectedProductIds().length > 0">
                <span class="selected-tag" *ngFor="let productId of getSelectedProductIds()">
                  {{ getProductNameById(productId) }}
                  <button type="button" (click)="removeProduct(productId)" class="remove-tag">×</button>
                </span>
              </div>
              <div class="dropdown-list" *ngIf="showProductDropdown()">
                <div *ngIf="filteredProducts().length > 0">
                  <div
                    *ngFor="let product of filteredProducts()"
                    class="dropdown-item checkbox-item"
                    (click)="toggleProduct(product.id)"
                  >
                    <input
                      type="checkbox"
                      [checked]="isProductSelected(product.id)"
                      (change)="toggleProduct(product.id)"
                      (click)="$event.stopPropagation()"
                    />
                    <div class="product-info">
                      <strong>{{ product.name }}</strong>
                      <span class="product-sku">{{ product.sku }}</span>
                    </div>
                  </div>
                </div>
                <div *ngIf="filteredProducts().length === 0 && products().length > 0 && productSearchTerm()" class="dropdown-item empty">
                  No products found matching "{{ productSearchTerm() }}"
                </div>
                <div *ngIf="productsLoading()" class="dropdown-item empty">
                  Loading products...
                </div>
                <div *ngIf="!productsLoading() && products().length === 0" class="dropdown-item empty">
                  No products available. Please add products first.
                </div>
              </div>
            </div>
            <small *ngIf="createForm.get('productIds')?.invalid && createForm.get('productIds')?.touched">
              At least one product is required when scope is Product.
            </small>
          </label>
          <label *ngIf="createForm.get('scope')?.value === 'Category'" class="category-select-wrapper">
            <span>Category <span class="required">*</span></span>
            <div class="searchable-select">
              <input
                type="text"
                [value]="getSelectedCategoryName()"
                (focus)="showCategoryDropdown.set(true)"
                (input)="onCategorySearch($event)"
                placeholder="Search and select a category..."
                class="category-search-input"
              />
              <div class="dropdown-list" *ngIf="showCategoryDropdown()">
                <div *ngIf="filteredCategories().length > 0">
                  <div
                    *ngFor="let category of filteredCategories()"
                    class="dropdown-item"
                    (click)="selectCategory(category.id, category.name)"
                  >
                    {{ category.name }}
                  </div>
                </div>
                <div *ngIf="filteredCategories().length === 0 && categories().length > 0 && categorySearchTerm()" class="dropdown-item empty">
                  No categories found matching "{{ categorySearchTerm() }}"
                </div>
                <div *ngIf="categoriesLoading()" class="dropdown-item empty">
                  Loading categories...
                </div>
                <div *ngIf="!categoriesLoading() && categories().length === 0" class="dropdown-item empty">
                  No categories available. Please add categories first.
                </div>
              </div>
            </div>
            <small *ngIf="createForm.get('categoryId')?.invalid && createForm.get('categoryId')?.touched">
              Category is required when scope is Category.
            </small>
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Valid From <span class="required">*</span></span>
            <input formControlName="validFrom" type="datetime-local" />
            <small *ngIf="createForm.get('validFrom')?.invalid && createForm.get('validFrom')?.touched">
              Valid from date is required.
            </small>
          </label>
          <label>
            <span>Valid Until</span>
            <input formControlName="validUntil" type="datetime-local" />
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Max Uses</span>
            <input formControlName="maxUses" type="number" min="1" placeholder="Unlimited" />
          </label>
          <label>
            <span>Max Uses Per Customer</span>
            <input formControlName="maxUsesPerCustomer" type="number" min="1" placeholder="Unlimited" />
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Minimum Order Amount</span>
            <input formControlName="minimumOrderAmount" type="number" step="0.01" placeholder="0" />
          </label>
          <label>
            <span>Minimum Order Currency</span>
            <input formControlName="minimumOrderCurrency" type="text" maxlength="3" placeholder="INR" />
          </label>
        </div>

        <label class="checkbox-label">
          <input type="checkbox" formControlName="isActive" />
          <span>Active</span>
        </label>

        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="cancelCreate()">Cancel</button>
          <button type="submit" [disabled]="createForm.invalid || createInFlight()">Create Discount</button>
        </div>
      </form>
      </app-modal>

    <!-- Edit Discount Modal -->
    <app-modal [isOpen]="editingDiscountId() !== null" title="Edit Discount" (closeModal)="cancelEdit()">
      <form [formGroup]="editForm" (ngSubmit)="updateDiscount()">
        <div class="form-row">
          <label>
            <span>Code</span>
            <input formControlName="code" type="text" [readonly]="true" />
            <small>Code cannot be changed after creation</small>
          </label>
          <label>
            <span>Name <span class="required">*</span></span>
            <input formControlName="name" type="text" placeholder="20% Off Sale" />
            <small *ngIf="editForm.get('name')?.invalid && editForm.get('name')?.touched">Name is required.</small>
          </label>
        </div>

        <label>
          <span>Description</span>
          <textarea formControlName="description" rows="3" placeholder="Discount description"></textarea>
        </label>

        <div class="form-row">
          <label>
            <span>Discount Type <span class="required">*</span></span>
            <select formControlName="discountType">
              <option value="Percentage">Percentage</option>
              <option value="FixedAmount">Fixed Amount</option>
              <option value="FreeShipping">Free Shipping</option>
            </select>
          </label>
          <label *ngIf="editForm.get('discountType')?.value !== 'FreeShipping'">
            <span>Discount Value <span class="required">*</span></span>
            <input formControlName="discountValue" type="number" step="0.01" placeholder="20" />
            <small *ngIf="editForm.get('discountValue')?.invalid && editForm.get('discountValue')?.touched">
              Value is required.
            </small>
          </label>
          <label *ngIf="editForm.get('discountType')?.value === 'FixedAmount'">
            <span>Currency</span>
            <input formControlName="discountCurrency" type="text" maxlength="3" placeholder="INR" />
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Scope <span class="required">*</span></span>
            <select formControlName="scope">
              <option value="Order">Order</option>
              <option value="Cart">Cart</option>
              <option value="Product">Product</option>
              <option value="Category">Category</option>
            </select>
          </label>
          <label *ngIf="editForm.get('scope')?.value === 'Product'" class="product-select-wrapper">
            <span>Products <span class="required">*</span></span>
            <div class="searchable-select">
              <input
                type="text"
                [value]="productSearchTerm()"
                (focus)="onProductInputFocus()"
                (input)="onProductSearch($event)"
                placeholder="Search products..."
                class="product-search-input"
              />
              <div class="selected-products" *ngIf="getSelectedProductIdsEdit().length > 0">
                <span class="selected-tag" *ngFor="let productId of getSelectedProductIdsEdit()">
                  {{ getProductNameById(productId) }}
                  <button type="button" (click)="removeProductEdit(productId)" class="remove-tag">×</button>
                </span>
              </div>
              <div class="dropdown-list" *ngIf="showProductDropdown()">
                <div *ngIf="filteredProducts().length > 0">
                  <div
                    *ngFor="let product of filteredProducts()"
                    class="dropdown-item checkbox-item"
                    (click)="toggleProductEdit(product.id)"
                  >
                    <input
                      type="checkbox"
                      [checked]="isProductSelectedEdit(product.id)"
                      (change)="toggleProductEdit(product.id)"
                      (click)="$event.stopPropagation()"
                    />
                    <div class="product-info">
                      <strong>{{ product.name }}</strong>
                      <span class="product-sku">{{ product.sku }}</span>
                    </div>
                  </div>
                </div>
                <div *ngIf="filteredProducts().length === 0 && products().length > 0 && productSearchTerm()" class="dropdown-item empty">
                  No products found matching "{{ productSearchTerm() }}"
                </div>
                <div *ngIf="productsLoading()" class="dropdown-item empty">
                  Loading products...
                </div>
                <div *ngIf="!productsLoading() && products().length === 0" class="dropdown-item empty">
                  No products available. Please add products first.
                </div>
              </div>
            </div>
            <small *ngIf="editForm.get('productIds')?.invalid && editForm.get('productIds')?.touched">
              At least one product is required when scope is Product.
            </small>
          </label>
          <label *ngIf="editForm.get('scope')?.value === 'Category'" class="category-select-wrapper">
            <span>Category <span class="required">*</span></span>
            <div class="searchable-select">
              <input
                type="text"
                [value]="getSelectedCategoryNameEdit()"
                (focus)="showCategoryDropdown.set(true)"
                (input)="onCategorySearch($event)"
                placeholder="Search and select a category..."
                class="category-search-input"
              />
              <div class="dropdown-list" *ngIf="showCategoryDropdown()">
                <div *ngIf="filteredCategories().length > 0">
                  <div
                    *ngFor="let category of filteredCategories()"
                    class="dropdown-item"
                    (click)="selectCategoryEdit(category.id, category.name)"
                  >
                    {{ category.name }}
                  </div>
                </div>
                <div *ngIf="filteredCategories().length === 0 && categories().length > 0 && categorySearchTerm()" class="dropdown-item empty">
                  No categories found matching "{{ categorySearchTerm() }}"
                </div>
                <div *ngIf="categoriesLoading()" class="dropdown-item empty">
                  Loading categories...
                </div>
                <div *ngIf="!categoriesLoading() && categories().length === 0" class="dropdown-item empty">
                  No categories available. Please add categories first.
                </div>
              </div>
            </div>
            <small *ngIf="editForm.get('categoryId')?.invalid && editForm.get('categoryId')?.touched">
              Category is required when scope is Category.
            </small>
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Valid From <span class="required">*</span></span>
            <input formControlName="validFrom" type="datetime-local" />
            <small *ngIf="editForm.get('validFrom')?.invalid && editForm.get('validFrom')?.touched">
              Valid from date is required.
            </small>
          </label>
          <label>
            <span>Valid Until</span>
            <input formControlName="validUntil" type="datetime-local" />
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Max Uses</span>
            <input formControlName="maxUses" type="number" min="1" placeholder="Unlimited" />
          </label>
          <label>
            <span>Max Uses Per Customer</span>
            <input formControlName="maxUsesPerCustomer" type="number" min="1" placeholder="Unlimited" />
          </label>
        </div>

        <div class="form-row">
          <label>
            <span>Minimum Order Amount</span>
            <input formControlName="minimumOrderAmount" type="number" step="0.01" placeholder="0" />
          </label>
          <label>
            <span>Minimum Order Currency</span>
            <input formControlName="minimumOrderCurrency" type="text" maxlength="3" placeholder="INR" />
          </label>
        </div>

        <label class="checkbox-label">
          <input type="checkbox" formControlName="isActive" />
          <span>Active</span>
        </label>

        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="cancelEdit()">Cancel</button>
          <button type="submit" [disabled]="editForm.invalid || updateInFlight()">Update Discount</button>
        </div>
      </form>
      </app-modal>
  `,
  styles: [
    `
      .panel {
        background: #fff;
        padding: 1.5rem;
        border-radius: 1rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }
      .panel__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .panel__header h2 {
        color: var(--premium-onyx);
      }
      .header-actions {
        display: flex;
        gap: 0.75rem;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
        align-items: flex-end;
      }
      .search-field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .search-field input {
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
      }
      .search-field input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }
      .status-pills {
        display: flex;
        gap: 0.5rem;
      }
      .status-pills button {
        padding: 0.5rem 1rem;
        border-radius: 999px;
        border: 1px solid var(--premium-silver);
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        cursor: pointer;
        transition: all 0.2s;
      }
      .status-pills button.active {
        background: rgba(183, 110, 121, 0.12);
        border-color: var(--premium-rose-gold);
        color: var(--premium-rose-gold);
      }
      .discount-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .stat-card {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 0.75rem;
        padding: 1rem;
        box-shadow: 0 10px 30px var(--premium-shadow);
      }
      .stat-card .label {
        display: block;
        font-size: 0.8rem;
        color: var(--premium-titanium);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .stat-card strong {
        font-size: 1.75rem;
        color: var(--premium-onyx);
      }
      .discounts-layout {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
      }
      .table-wrapper {
        background: #fff;
        border-radius: 1rem;
        border: 1px solid var(--premium-silver);
        padding: 1rem;
        position: relative;
        box-shadow: 0 10px 30px var(--premium-shadow);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        background: var(--premium-moonstone);
        text-align: left;
        padding: 0.75rem;
        border-bottom: 2px solid var(--premium-silver);
        text-transform: uppercase;
        font-size: 0.75rem;
        color: var(--premium-titanium);
        letter-spacing: 0.08em;
        font-weight: 600;
      }
      td {
        text-align: left;
        padding: 0.75rem;
        border-bottom: 1px solid var(--premium-silver);
        color: var(--premium-onyx);
      }
      tr {
        cursor: pointer;
        transition: background 0.2s;
      }
      tr:hover {
        background: var(--premium-moonstone);
      }
      tr.selected {
        background: rgba(183, 110, 121, 0.12);
      }
      code {
        background: rgba(183, 110, 121, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 0.35rem;
        font-family: monospace;
        font-size: 0.85rem;
        color: var(--premium-rose-gold);
      }
      .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      .badge-active {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      .badge-inactive {
        background: rgba(148, 163, 184, 0.2);
        color: #94a3b8;
      }
      .badge-expired {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }
      .badge-type {
        background: rgba(139, 92, 246, 0.2);
        color: #8b5cf6;
      }
      .badge-scope {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
      }
      .discount-detail {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 1rem;
        padding: 1.5rem;
        position: sticky;
        top: 1rem;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        box-shadow: 0 10px 30px var(--premium-shadow);
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--premium-silver);
      }
      .detail-eyebrow {
        font-size: 0.75rem;
        color: var(--premium-titanium);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0 0 0.5rem;
      }
      .detail-header h3 {
        margin: 0 0 0.5rem;
        color: var(--premium-onyx);
      }
      dl {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      dl div {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      dt {
        font-size: 0.75rem;
        color: var(--premium-titanium);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      dd {
        color: var(--premium-onyx);
        margin: 0;
      }
      .detail-toast {
        margin-top: 1rem;
        padding: 0.75rem;
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid #10b981;
        border-radius: 0.5rem;
        color: #10b981;
        font-size: 0.875rem;
      }
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
      }
      .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      .empty-state h3 {
        color: var(--premium-onyx);
        margin: 0 0 0.5rem;
      }
      .empty-state p {
        color: var(--premium-titanium);
        margin: 0 0 1.5rem;
      }
      .inline-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
      }
      .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid var(--premium-silver);
        border-top-color: var(--premium-rose-gold);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .btn-primary,
      .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-primary {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
      }
      .btn-primary:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        border: 1px solid var(--premium-silver);
      }
      .btn-secondary:hover:not(:disabled) {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      label span {
        color: var(--premium-onyx);
        font-weight: 500;
      }
      .required {
        color: #ef4444;
      }
      input[type='text'],
      input[type='number'],
      input[type='datetime-local'],
      select,
      textarea {
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
      }
      input:focus,
      select:focus,
      textarea:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }
      small {
        color: #ef4444;
        font-size: 0.875rem;
      }
      .checkbox-label {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
      }
      .checkbox-label input[type='checkbox'] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
      }
      .searchable-select {
        position: relative;
      }
      .product-search-input,
      .category-search-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
      }
      .product-search-input:focus,
      .category-search-input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }
      .dropdown-list {
        position: absolute;
        top: calc(100% + 0.25rem);
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        box-shadow: 0 10px 40px var(--premium-shadow);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
      }
      .dropdown-item {
        padding: 0.875rem 1rem;
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 1px solid var(--premium-silver);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }
      .dropdown-item:last-child {
        border-bottom: none;
      }
      .dropdown-item:hover {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
      }
      .dropdown-item strong {
        color: var(--premium-onyx);
        font-weight: 600;
      }
      .dropdown-item .product-sku {
        color: var(--premium-titanium);
        font-size: 0.875rem;
        font-family: monospace;
      }
      .dropdown-item.empty {
        color: var(--premium-titanium);
        cursor: default;
        font-style: italic;
      }
      .dropdown-item.empty:hover {
        background: transparent;
      }
      .dropdown-item.checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
      }
      .dropdown-item.checkbox-item input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
        accent-color: var(--premium-gold);
      }
      .dropdown-item.checkbox-item .product-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .selected-products {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .selected-tag {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        background: var(--premium-gold);
        color: var(--premium-onyx);
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
      }
      .selected-tag .remove-tag {
        background: none;
        border: none;
        color: var(--premium-onyx);
        cursor: pointer;
        font-size: 1.25rem;
        line-height: 1;
        padding: 0;
        width: 1.25rem;
        height: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }
      .selected-tag .remove-tag:hover {
        background: rgba(0, 0, 0, 0.1);
      }
    `,
  ],
})
export class DiscountsComponent implements OnInit {
  discountsView$!: Observable<DiscountViewModel>;
  createForm: FormGroup;
  filterForm: FormGroup;
  showCreateForm = signal(false);
  readonly createInFlight = signal(false);
  selectedDiscount = signal<Discount | null>(null);
  discountActionMessage = signal<string | null>(null);
  discountsLoading = signal(false);
  editingDiscountId = signal<string | null>(null);
  editForm: FormGroup;
  readonly updateInFlight = signal(false);
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly productsLoading = signal<boolean>(true);
  readonly categoriesLoading = signal<boolean>(true);
  readonly productSearchTerm = signal<string>('');
  readonly showProductDropdown = signal<boolean>(false);
  readonly categorySearchTerm = signal<string>('');
  readonly showCategoryDropdown = signal<boolean>(false);

  private readonly refreshDiscounts$ = new BehaviorSubject<void>(undefined);

  constructor(
    private readonly discountService: DiscountService,
    private readonly catalogService: CatalogService,
    private readonly categoryService: CategoryService,
    private readonly fb: FormBuilder,
  ) {
    this.createForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(64)]],
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      discountType: ['Percentage', Validators.required],
      discountValue: [null],
      discountCurrency: ['INR'],
      scope: ['Order', Validators.required],
      productId: [null], // Deprecated, kept for backward compatibility
      productIds: [[], Validators.required], // Array of product IDs
      categoryId: [null],
      validFrom: ['', Validators.required],
      validUntil: [null],
      maxUses: [null],
      maxUsesPerCustomer: [null],
      minimumOrderAmount: [null],
      minimumOrderCurrency: ['INR'],
      isActive: [true],
    });

    // Update validators based on discount type
    this.createForm.get('discountType')?.valueChanges.subscribe((type) => {
      const valueControl = this.createForm.get('discountValue');
      if (type === 'FreeShipping') {
        valueControl?.clearValidators();
      } else {
        valueControl?.setValidators([Validators.required, Validators.min(0)]);
      }
      valueControl?.updateValueAndValidity();
    });

    // Update validators based on scope
    this.createForm.get('scope')?.valueChanges.subscribe((scope) => {
      const productIdsControl = this.createForm.get('productIds');
      const categoryIdControl = this.createForm.get('categoryId');
      
      if (scope === 'Product') {
        productIdsControl?.setValidators([Validators.required, (control) => {
          const value = control.value as string[];
          return value && value.length > 0 ? null : { required: true };
        }]);
        categoryIdControl?.clearValidators();
        categoryIdControl?.setValue(null);
        productIdsControl?.setValue([]);
        this.productSearchTerm.set('');
        this.showProductDropdown.set(false);
      } else if (scope === 'Category') {
        categoryIdControl?.setValidators([Validators.required]);
        productIdsControl?.clearValidators();
        productIdsControl?.setValue([]);
        this.categorySearchTerm.set('');
        this.showCategoryDropdown.set(false);
      } else {
        productIdsControl?.clearValidators();
        categoryIdControl?.clearValidators();
        productIdsControl?.setValue([]);
        categoryIdControl?.setValue(null);
        this.productSearchTerm.set('');
        this.categorySearchTerm.set('');
        this.showProductDropdown.set(false);
        this.showCategoryDropdown.set(false);
      }
      productIdsControl?.updateValueAndValidity();
      categoryIdControl?.updateValueAndValidity();
    });

    this.filterForm = this.fb.group({
      search: [''],
      status: ['all'],
    });

    this.editForm = this.fb.group({
      code: [{ value: '', disabled: true }],
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      discountType: ['Percentage', Validators.required],
      discountValue: [null],
      discountCurrency: ['INR'],
      scope: ['Order', Validators.required],
      productId: [null], // Deprecated, kept for backward compatibility
      productIds: [[], Validators.required], // Array of product IDs
      categoryId: [null],
      validFrom: ['', Validators.required],
      validUntil: [null],
      maxUses: [null],
      maxUsesPerCustomer: [null],
      minimumOrderAmount: [null],
      minimumOrderCurrency: ['INR'],
      isActive: [true],
    });

    // Update validators based on discount type
    this.editForm.get('discountType')?.valueChanges.subscribe((type) => {
      const valueControl = this.editForm.get('discountValue');
      if (type === 'FreeShipping') {
        valueControl?.clearValidators();
      } else {
        valueControl?.setValidators([Validators.required, Validators.min(0)]);
      }
      valueControl?.updateValueAndValidity();
    });

    // Update validators based on scope
    this.editForm.get('scope')?.valueChanges.subscribe((scope) => {
      const productIdsControl = this.editForm.get('productIds');
      const categoryIdControl = this.editForm.get('categoryId');
      
      if (scope === 'Product') {
        productIdsControl?.setValidators([Validators.required, (control) => {
          const value = control.value as string[];
          return value && value.length > 0 ? null : { required: true };
        }]);
        categoryIdControl?.clearValidators();
        categoryIdControl?.setValue(null);
        productIdsControl?.setValue([]);
        this.productSearchTerm.set('');
        this.showProductDropdown.set(false);
      } else if (scope === 'Category') {
        categoryIdControl?.setValidators([Validators.required]);
        productIdsControl?.clearValidators();
        productIdsControl?.setValue([]);
        this.categorySearchTerm.set('');
        this.showCategoryDropdown.set(false);
      } else {
        productIdsControl?.clearValidators();
        categoryIdControl?.clearValidators();
        productIdsControl?.setValue([]);
        categoryIdControl?.setValue(null);
        this.productSearchTerm.set('');
        this.categorySearchTerm.set('');
        this.showProductDropdown.set(false);
        this.showCategoryDropdown.set(false);
      }
      productIdsControl?.updateValueAndValidity();
      categoryIdControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    // Load products and categories - load all products with pagination
    this.productsLoading.set(true);
    this.loadAllProducts();

    this.categoriesLoading.set(true);
    this.categoryService.listCategories(true).subscribe({
      next: (response) => {
        this.categoriesLoading.set(false);
        this.categories.set(response.items);
        console.log('Loaded categories:', response.items.length);
      },
      error: (error) => {
        this.categoriesLoading.set(false);
        console.error('Failed to load categories:', error);
        this.categories.set([]);
      },
    });

    const discounts$ = this.refreshDiscounts$.pipe(
      tap(() => this.discountsLoading.set(true)),
      switchMap(() =>
        this.discountService.listDiscounts(1, 100).pipe(finalize(() => this.discountsLoading.set(false))),
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.discountsView$ = combineLatest([
      discounts$,
      this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    ]).pipe(
      map(([response, filters]) =>
        this.buildViewModel(response, (filters?.search ?? '') as string, filters?.status as DiscountStatusFilter)
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  setStatusFilter(status: DiscountStatusFilter): void {
    this.filterForm.patchValue({ status });
  }

  refreshDiscounts(): void {
    this.refreshDiscounts$.next(undefined);
  }

  createDiscount(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.createInFlight.set(true);

    const formValue = this.createForm.value;
    const payload: CreateDiscountRequest = {
      code: formValue.code.toUpperCase(),
      name: formValue.name,
      description: formValue.description || undefined,
      discountType: formValue.discountType,
      discountValue: formValue.discountValue ? Number(formValue.discountValue) : undefined,
      discountCurrency: formValue.discountCurrency || undefined,
      scope: formValue.scope,
      productIds: formValue.productIds && formValue.productIds.length > 0 ? formValue.productIds : undefined,
      categoryId: formValue.categoryId && formValue.categoryId !== '' ? formValue.categoryId : undefined,
      validFrom: new Date(formValue.validFrom).toISOString(),
      validUntil: formValue.validUntil ? new Date(formValue.validUntil).toISOString() : undefined,
      maxUses: formValue.maxUses ? Number(formValue.maxUses) : undefined,
      maxUsesPerCustomer: formValue.maxUsesPerCustomer ? Number(formValue.maxUsesPerCustomer) : undefined,
      minimumOrderAmount: formValue.minimumOrderAmount ? Number(formValue.minimumOrderAmount) : undefined,
      minimumOrderCurrency: formValue.minimumOrderCurrency || undefined,
      isActive: formValue.isActive ?? true,
    };

    this.discountService.createDiscount(payload).subscribe({
      next: () => {
        this.createForm.reset();
        this.showCreateForm.set(false);
        this.createInFlight.set(false);
        this.productSearchTerm.set('');
        this.categorySearchTerm.set('');
        this.showProductDropdown.set(false);
        this.showCategoryDropdown.set(false);
        this.showDiscountActionMessage('Discount created successfully');
        this.refreshDiscounts();
      },
      error: (error) => {
        this.createInFlight.set(false);
        this.showDiscountActionMessage(error.error?.detail || 'Failed to create discount');
      },
    });
  }

  cancelCreate(): void {
    this.createForm.reset();
    this.showCreateForm.set(false);
    this.productSearchTerm.set('');
    this.categorySearchTerm.set('');
    this.showProductDropdown.set(false);
    this.showCategoryDropdown.set(false);
  }

  selectDiscount(discount: Discount): void {
    this.selectedDiscount.set(discount);
  }

  isSelected(discount: Discount): boolean {
    return this.selectedDiscount()?.id === discount.id;
  }

  closeDiscountDetail(): void {
    this.selectedDiscount.set(null);
    this.editingDiscountId.set(null);
  }

  startEdit(discount: Discount): void {
    this.editingDiscountId.set(discount.id);
    // Format dates for datetime-local input
    const validFrom = new Date(discount.validFrom);
    const validUntil = discount.validUntil ? new Date(discount.validUntil) : null;
    
    // Handle productIds - use productIds if available, otherwise fallback to productId for backward compatibility
    const productIds = discount.productIds && discount.productIds.length > 0 
      ? discount.productIds 
      : (discount.productId ? [discount.productId] : []);
    
    this.editForm.patchValue({
      code: discount.code,
      name: discount.name,
      description: discount.description || '',
      discountType: discount.discountType,
      discountValue: discount.discountValue || null,
      discountCurrency: discount.discountCurrency || 'INR',
      scope: discount.scope,
      productId: discount.productId || null, // Keep for backward compatibility
      productIds: productIds,
      categoryId: discount.categoryId || null,
      validFrom: this.formatDateTimeLocal(validFrom),
      validUntil: validUntil ? this.formatDateTimeLocal(validUntil) : null,
      maxUses: discount.maxUses || null,
      maxUsesPerCustomer: discount.maxUsesPerCustomer || null,
      minimumOrderAmount: discount.minimumOrderAmount || null,
      minimumOrderCurrency: discount.minimumOrderCurrency || 'INR',
      isActive: discount.isActive,
    });

    // Set search terms for selected product/category
    if (discount.productId) {
      const product = this.products().find((p) => p.id === discount.productId);
      if (product) {
        this.productSearchTerm.set(product.name);
      }
    }
    if (discount.categoryId) {
      const category = this.categories().find((c) => c.id === discount.categoryId);
      if (category) {
        this.categorySearchTerm.set(category.name);
      }
    }

    // Update validators based on discount type
    const valueControl = this.editForm.get('discountValue');
    if (discount.discountType === 'FreeShipping') {
      valueControl?.clearValidators();
    } else {
      valueControl?.setValidators([Validators.required, Validators.min(0)]);
    }
    valueControl?.updateValueAndValidity();

    // Update validators based on scope
    const productIdControl = this.editForm.get('productId');
    const categoryIdControl = this.editForm.get('categoryId');
    
    if (discount.scope === 'Product') {
      productIdControl?.setValidators([Validators.required]);
      categoryIdControl?.clearValidators();
    } else if (discount.scope === 'Category') {
      categoryIdControl?.setValidators([Validators.required]);
      productIdControl?.clearValidators();
    } else {
      productIdControl?.clearValidators();
      categoryIdControl?.clearValidators();
    }
    productIdControl?.updateValueAndValidity();
    categoryIdControl?.updateValueAndValidity();
  }

  cancelEdit(): void {
    this.editingDiscountId.set(null);
    this.editForm.reset();
    this.productSearchTerm.set('');
    this.categorySearchTerm.set('');
    this.showProductDropdown.set(false);
    this.showCategoryDropdown.set(false);
  }

  updateDiscount(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.updateInFlight.set(true);

    const discountId = this.editingDiscountId();
    if (!discountId) {
      return;
    }

    const formValue = this.editForm.value;
    const payload: UpdateDiscountRequest = {
      name: formValue.name,
      description: formValue.description || undefined,
      discountType: formValue.discountType,
      discountValue: formValue.discountValue ? Number(formValue.discountValue) : undefined,
      discountCurrency: formValue.discountCurrency || undefined,
      scope: formValue.scope,
      productIds: formValue.productIds && formValue.productIds.length > 0 ? formValue.productIds : undefined,
      categoryId: formValue.categoryId && formValue.categoryId !== '' ? formValue.categoryId : undefined,
      validFrom: new Date(formValue.validFrom).toISOString(),
      validUntil: formValue.validUntil ? new Date(formValue.validUntil).toISOString() : undefined,
      maxUses: formValue.maxUses ? Number(formValue.maxUses) : undefined,
      maxUsesPerCustomer: formValue.maxUsesPerCustomer ? Number(formValue.maxUsesPerCustomer) : undefined,
      minimumOrderAmount: formValue.minimumOrderAmount ? Number(formValue.minimumOrderAmount) : undefined,
      minimumOrderCurrency: formValue.minimumOrderCurrency || undefined,
      isActive: formValue.isActive ?? true,
    };

    this.discountService.updateDiscount(discountId, payload).subscribe({
      next: () => {
        this.editingDiscountId.set(null);
        this.editForm.reset();
        this.updateInFlight.set(false);
        this.showDiscountActionMessage('Discount updated successfully');
        this.refreshDiscounts();
        // Refresh selected discount
        if (this.selectedDiscount()) {
          this.discountService.getDiscount(discountId).subscribe((discount) => {
            this.selectedDiscount.set(discount);
          });
        }
      },
      error: (error) => {
        this.updateInFlight.set(false);
        this.showDiscountActionMessage(error.error?.detail || 'Failed to update discount');
      },
    });
  }

  private formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  filteredProducts(): Product[] {
    const search = this.productSearchTerm().toLowerCase().trim();
    const allProducts = this.products();
    
    // If no search term, return all products (limited to first 100 for performance)
    if (!search) {
      return allProducts.slice(0, 100);
    }
    
    // Filter products by search term
    return allProducts.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(search)) ||
        (p.sku && p.sku.toLowerCase().includes(search)) ||
        (p.description && p.description.toLowerCase().includes(search))
    );
  }

  filteredCategories(): Category[] {
    const search = this.categorySearchTerm().toLowerCase().trim();
    const allCategories = this.categories();
    
    // If no search term, return all categories
    if (!search) {
      return allCategories;
    }
    
    // Filter categories by search term
    return allCategories.filter((c) => c.name && c.name.toLowerCase().includes(search));
  }

  onProductInputFocus(): void {
    this.showProductDropdown.set(true);
    // If no search term, clear it to show all products
    if (!this.productSearchTerm() || this.productSearchTerm().trim() === '') {
      this.productSearchTerm.set('');
    }
  }

  onProductSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.productSearchTerm.set(value || '');
    this.showProductDropdown.set(true);
  }

  onCategorySearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.categorySearchTerm.set(target.value);
    this.showCategoryDropdown.set(true);
  }

  toggleProduct(productId: string): void {
    const productIdsControl = this.createForm.get('productIds');
    const currentIds = (productIdsControl?.value as string[]) || [];
    const index = currentIds.indexOf(productId);
    
    if (index > -1) {
      // Remove product
      currentIds.splice(index, 1);
    } else {
      // Add product
      currentIds.push(productId);
    }
    
    productIdsControl?.setValue([...currentIds]);
    productIdsControl?.updateValueAndValidity();
  }

  toggleProductEdit(productId: string): void {
    const productIdsControl = this.editForm.get('productIds');
    const currentIds = (productIdsControl?.value as string[]) || [];
    const index = currentIds.indexOf(productId);
    
    if (index > -1) {
      // Remove product
      currentIds.splice(index, 1);
    } else {
      // Add product
      currentIds.push(productId);
    }
    
    productIdsControl?.setValue([...currentIds]);
    productIdsControl?.updateValueAndValidity();
  }

  removeProduct(productId: string): void {
    const productIdsControl = this.createForm.get('productIds');
    const currentIds = (productIdsControl?.value as string[]) || [];
    const index = currentIds.indexOf(productId);
    if (index > -1) {
      currentIds.splice(index, 1);
      productIdsControl?.setValue([...currentIds]);
      productIdsControl?.updateValueAndValidity();
    }
  }

  removeProductEdit(productId: string): void {
    const productIdsControl = this.editForm.get('productIds');
    const currentIds = (productIdsControl?.value as string[]) || [];
    const index = currentIds.indexOf(productId);
    if (index > -1) {
      currentIds.splice(index, 1);
      productIdsControl?.setValue([...currentIds]);
      productIdsControl?.updateValueAndValidity();
    }
  }

  isProductSelected(productId: string): boolean {
    const productIds = (this.createForm.get('productIds')?.value as string[]) || [];
    return productIds.includes(productId);
  }

  isProductSelectedEdit(productId: string): boolean {
    const productIds = (this.editForm.get('productIds')?.value as string[]) || [];
    return productIds.includes(productId);
  }

  getSelectedProductIds(): string[] {
    return (this.createForm.get('productIds')?.value as string[]) || [];
  }

  getSelectedProductIdsEdit(): string[] {
    return (this.editForm.get('productIds')?.value as string[]) || [];
  }

  getProductNameById(productId: string): string {
    const product = this.products().find((p) => p.id === productId);
    return product ? product.name : productId;
  }

  selectCategory(categoryId: string, categoryName: string): void {
    this.createForm.patchValue({ categoryId });
    this.categorySearchTerm.set(categoryName);
    this.showCategoryDropdown.set(false);
  }

  selectCategoryEdit(categoryId: string, categoryName: string): void {
    this.editForm.patchValue({ categoryId });
    this.categorySearchTerm.set(categoryName);
    this.showCategoryDropdown.set(false);
  }

  getSelectedProductName(): string {
    const productId = this.createForm.get('productId')?.value;
    if (!productId) {
      return this.productSearchTerm() || '';
    }
    const product = this.products().find((p) => p.id === productId);
    return product ? product.name : this.productSearchTerm() || '';
  }

  getSelectedProductNameEdit(): string {
    const productId = this.editForm.get('productId')?.value;
    if (!productId) {
      return this.productSearchTerm() || '';
    }
    const product = this.products().find((p) => p.id === productId);
    return product ? product.name : this.productSearchTerm() || '';
  }

  getSelectedCategoryName(): string {
    const categoryId = this.createForm.get('categoryId')?.value;
    if (!categoryId) {
      return this.categorySearchTerm() || '';
    }
    const category = this.categories().find((c) => c.id === categoryId);
    return category ? category.name : this.categorySearchTerm() || '';
  }

  getSelectedCategoryNameEdit(): string {
    const categoryId = this.editForm.get('categoryId')?.value;
    if (!categoryId) {
      return this.categorySearchTerm() || '';
    }
    const category = this.categories().find((c) => c.id === categoryId);
    return category ? category.name : this.categorySearchTerm() || '';
  }

  private buildViewModel(
    response: DiscountListResponse,
    searchRaw: string,
    status?: DiscountStatusFilter
  ): DiscountViewModel {
    const search = (searchRaw ?? '').toLowerCase().trim();
    const statusFilter: DiscountStatusFilter = status ?? 'all';

    const filteredItems = response.items.filter((discount: Discount) => {
      const matchesSearch =
        !search ||
        discount.code.toLowerCase().includes(search) ||
        discount.name.toLowerCase().includes(search) ||
        (discount.description && discount.description.toLowerCase().includes(search));
      const matchesStatus = statusFilter === 'all' ? true : discount.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const stats = {
      active: response.items.filter((d: Discount) => d.status === 'Active').length,
      inactive: response.items.filter((d: Discount) => d.status === 'Inactive').length,
      expired: response.items.filter((d: Discount) => d.status === 'Expired').length,
    };

    return {
      items: filteredItems,
      total: response.total,
      filteredTotal: filteredItems.length,
      stats,
    };
  }

  private showDiscountActionMessage(message: string): void {
    this.discountActionMessage.set(message);
    setTimeout(() => this.discountActionMessage.set(null), 3000);
  }

  private loadAllProducts(): void {
    const allProducts: Product[] = [];
    let currentPage = 1;
    const pageSize = 200; // API max page size
    let hasMore = true;

    const loadPage = () => {
      this.catalogService.listProducts(currentPage, pageSize).subscribe({
        next: (response) => {
          if (response.items && response.items.length > 0) {
            allProducts.push(...response.items);
            
            // Check if there are more pages
            const totalPages = Math.ceil(response.total / pageSize);
            if (currentPage < totalPages) {
              currentPage++;
              loadPage(); // Load next page
            } else {
              // All products loaded
              this.products.set(allProducts);
              this.productsLoading.set(false);
              console.log('Loaded all products:', allProducts.length, 'Total:', response.total);
            }
          } else {
            // No more products
            this.products.set(allProducts);
            this.productsLoading.set(false);
            console.log('Loaded all products:', allProducts.length);
          }
        },
        error: (error) => {
          this.productsLoading.set(false);
          console.error('Failed to load products:', error);
          // Still set what we have loaded so far
          if (allProducts.length > 0) {
            this.products.set(allProducts);
            console.log('Loaded partial products:', allProducts.length);
          } else {
            this.products.set([]);
            this.showDiscountActionMessage('Failed to load products. Please refresh the page.');
          }
        },
      });
    };

    loadPage();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.product-select-wrapper') && !target.closest('.category-select-wrapper')) {
      this.showProductDropdown.set(false);
      this.showCategoryDropdown.set(false);
    }
  }
}

