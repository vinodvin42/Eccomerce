import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, signal, untracked } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { CatalogService } from '../../core/services/catalog.service';
import { CategoryService } from '../../core/services/category.service';
import type { Category } from '../../shared/models/category';
import type { Product, ProductListResponse } from '../../shared/models/catalog';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ProductFormComponent } from '../../shared/components/product-form/product-form.component';
import { ProductListComponent } from '../../shared/components/product-list/product-list.component';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, ReactiveFormsModule, FormsModule, CurrencyPipe, ModalComponent, ProductFormComponent, ProductListComponent, ImageUploadComponent],
  template: `
    <div class="page-container">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <h1>Products Management</h1>
          <p class="page-subtitle">Manage your product catalog</p>
        </div>
        <button class="btn-primary" (click)="showAddForm.set(true)">
          <span>➕</span>
          Add Product
        </button>
      </div>

      <!-- Add Product Modal -->
      <app-modal [isOpen]="showAddForm()" title="Add New Product" (closeModal)="showAddForm.set(false)">
        <app-product-form
          [form]="form"
          [categories]="categories()"
          [loading]="createInFlight()"
          submitLabel="Save Product"
          (submit)="createProduct()"
          (cancel)="cancelAdd()"
        ></app-product-form>
      </app-modal>

      <!-- Products List -->
      <div class="panel products-list-panel">
        <div class="panel-header">
          <div>
            <h2>Products</h2>
            <p class="panel-subtitle">Total: {{ totalProducts() }} products</p>
          </div>
          <div class="filters-container">
            <div class="search-container">
              <input
                type="search"
                class="search-input"
                placeholder="Search by name or SKU..."
                (input)="onSearch($event)"
                [value]="searchTerm()"
              />
              <span class="search-icon">🔍</span>
            </div>
            <select class="filter-select" (change)="onCategoryFilterChange($event)" [value]="categoryFilter()">
              <option value="">All Categories</option>
              <option *ngFor="let category of categories()" [value]="category.id">
                {{ category.name }}
              </option>
            </select>
            <select class="filter-select" (change)="onStockFilterChange($event)" [value]="stockFilter()">
              <option value="all">All Stock</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock (&le; 5)</option>
              <option value="out">Out of Stock</option>
            </select>
            <button
              class="btn-secondary"
              type="button"
              (click)="resetFilters()"
              [disabled]="loading() || (!searchTerm() && !categoryFilter() && stockFilter() === 'all')"
            >
              Clear
            </button>
            <button class="btn-secondary" type="button" (click)="loadProducts()" [disabled]="loading()">
              Refresh
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="loading-state">
          <div class="spinner"></div>
          <p>Loading products...</p>
        </div>

        <!-- Products Table -->
        <div *ngIf="(products$ | async) as products">
          <ng-container *ngIf="!error(); else productErrorState">
            <div *ngIf="products.items.length > 0; else emptyState">
              <app-product-list
                [products]="products.items"
                [getCategoryName]="getCategoryName.bind(this)"
                (edit)="startEdit($event)"
                (delete)="deleteProduct($event)"
              ></app-product-list>
              <div class="pagination-controls">
                <button
                  class="btn-secondary"
                  type="button"
                  (click)="changePage('prev', products.total)"
                  [disabled]="page() === 1 || loading()"
                >
                  ← Prev
                </button>
                <span class="page-info">
                  Page {{ page() }} of {{ getTotalPages(products.total) }} · {{ products.total }} products
                </span>
                <button
                  class="btn-secondary"
                  type="button"
                  (click)="changePage('next', products.total)"
                  [disabled]="page() >= getTotalPages(products.total) || loading()"
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

        <ng-template #productErrorState>
          <div class="error-state">
            <span class="error-icon">⚠️</span>
            <p>{{ error() }}</p>
            <button class="btn-secondary" (click)="loadProducts()">Retry</button>
          </div>
        </ng-template>

        <ng-template #emptyState>
          <div class="empty-state" *ngIf="!loading()">
            <div class="empty-icon">📦</div>
            <h3>No products found</h3>
            <p *ngIf="searchTerm()">Try adjusting your search terms</p>
            <p *ngIf="!searchTerm()">Get started by adding your first product</p>
            <button *ngIf="!searchTerm()" class="btn-primary" (click)="showAddForm.set(true)">
              Add Your First Product
            </button>
          </div>
        </ng-template>
      </div>

      <!-- Edit Product Modal -->
      <app-modal [isOpen]="editingProductId() !== null" title="Edit Product" (closeModal)="cancelEdit()">
        <form *ngIf="editForm && editForm.get('hsnCode') && editForm.get('group') && editForm.get('grossWeight')" [formGroup]="editForm" (ngSubmit)="updateProduct(editingProductId()!)" class="product-form">
          <div class="form-row">
            <label>
              <span>Product Name *</span>
              <input formControlName="name" type="text" placeholder="Enter product name" />
            </label>
            <label>
              <span>SKU *</span>
              <input formControlName="sku" type="text" placeholder="Enter SKU" />
            </label>
            <label>
              <span>Category</span>
              <select formControlName="categoryId">
                <option value="">Unassigned</option>
                <option *ngFor="let category of categories()" [value]="category.id">
                  {{ category.name }}
                </option>
              </select>
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Description</span>
              <textarea formControlName="description" placeholder="Enter product description" rows="3"></textarea>
            </label>
          </div>
          <div class="form-row full-width">
            <label>
              <span>Product Images</span>
              <app-image-upload
                [formControl]="editForm.get('imageUrls')!"
                (imagesChange)="onEditImagesChange($event)"
              ></app-image-upload>
              <small>Add multiple images by URL or upload files. Supported formats: JPG, PNG, WebP, GIF (max 5MB each).</small>
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Price (₹) *</span>
              <input formControlName="price" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
            <label>
              <span>Inventory *</span>
              <input formControlName="inventory" type="number" min="0" placeholder="0" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Net Wt (g)</span>
              <input formControlName="weight" type="number" step="0.001" min="0" placeholder="0.000" />
            </label>
            <label>
              <span>Material</span>
              <input formControlName="material" type="text" placeholder="e.g., Gold, Silver" />
            </label>
            <label>
              <span>Purity</span>
              <input formControlName="purity" type="text" placeholder="e.g., 22K, 18K, 925" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Stone Type</span>
              <input formControlName="stoneType" type="text" placeholder="e.g., Diamond, Ruby" />
            </label>
            <label>
              <span>Size</span>
              <input formControlName="size" type="text" placeholder="e.g., Ring size, Chain length" />
            </label>
            <label>
              <span>Color</span>
              <input formControlName="color" type="text" placeholder="e.g., Yellow Gold, White Gold" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Brand</span>
              <input formControlName="brand" type="text" placeholder="Brand or manufacturer" />
            </label>
            <label>
              <span>Certification</span>
              <input formControlName="certification" type="text" placeholder="Certification details" />
            </label>
            <label>
              <span>Warranty Period</span>
              <input formControlName="warrantyPeriod" type="text" placeholder="e.g., 1 Year, Lifetime" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Origin</span>
              <input formControlName="origin" type="text" placeholder="Country of manufacture" />
            </label>
            <label>
              <span>HSN Code</span>
              <input formControlName="hsnCode" type="text" placeholder="HSN Code for taxation" />
            </label>
            <label>
              <span>Group</span>
              <input formControlName="group" type="text" placeholder="e.g., Gold, Silver, Rose Gold" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Gross Weight (g)</span>
              <input formControlName="grossWeight" type="number" step="0.001" min="0" placeholder="0.000" />
            </label>
            <label>
              <span>Stone Weight (g)</span>
              <input formControlName="stoneWeight" type="number" step="0.001" min="0" placeholder="0.000" />
            </label>
            <label>
              <span>Rate/g (₹)</span>
              <input formControlName="ratePerGram" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Wastage %</span>
              <input formControlName="wastagePercent" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
            <label>
              <span>Metal Value (₹)</span>
              <input formControlName="metalValue" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
            <label>
              <span>Wastage Value (₹)</span>
              <input formControlName="wastageValue" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Making Charges (₹)</span>
              <input formControlName="makingCharges" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
            <label>
              <span>Stone Charges (₹)</span>
              <input formControlName="stoneCharges" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
            <label>
              <span>GST %</span>
              <input formControlName="gstPercent" type="number" step="0.01" min="0" placeholder="0.00" />
            </label>
          </div>
          <div class="form-row">
            <label>
              <span>Gender</span>
              <select formControlName="gender">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unisex">Unisex</option>
              </select>
            </label>
            <label>
              <span>Ready to Deliver</span>
              <select formControlName="readyToDeliver">
                <option [value]="false">No</option>
                <option [value]="true">Yes</option>
              </select>
            </label>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="cancelEdit()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="editForm.invalid || updateInFlight()">
              <span *ngIf="updateInFlight()">⏳</span>
              <span *ngIf="!updateInFlight()">💾</span>
              {{ updateInFlight() ? 'Saving...' : 'Save Product' }}
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `,
  styles: [
    `

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .page-header h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
        font-weight: 700;
        color: var(--premium-onyx);
      }

      .page-subtitle {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 1rem;
      }

      .panel {
        background: #fff;
        border-radius: 1rem;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }

      .add-product-panel {
        border: 2px solid var(--premium-rose-gold);
      }

      .add-product-panel h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        color: var(--premium-onyx);
      }

      .product-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .product-form label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-weight: 600;
        color: var(--premium-onyx);
        font-size: 0.9rem;
      }

      .product-form input[type='text'],
      .product-form input[type='number'],
      .product-form input[type='url'],
      .product-form select,
      .product-form textarea {
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
        transition: all 0.2s;
      }

      .product-form input:focus,
      .product-form select:focus,
      .product-form textarea:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .product-form textarea {
        resize: vertical;
        min-height: 80px;
      }

      .product-form small {
        color: #ef4444;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--premium-silver);
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .panel-header h2 {
        margin: 0 0 0.25rem 0;
        font-size: 1.5rem;
        color: var(--premium-onyx);
      }

      .panel-subtitle {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 0.875rem;
      }

      .filters-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        justify-content: flex-end;
      }

      .filter-select {
        padding: 0.65rem 1rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        background: #fff;
        color: var(--premium-onyx);
        font-size: 0.95rem;
        min-width: 180px;
      }

      .filter-select:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .search-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-input {
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
        min-width: 300px;
        transition: all 0.2s;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        color: var(--premium-titanium);
        pointer-events: none;
      }


      .error-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
      }


      .product-actions {
        text-align: center;
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

      .edit-form-cell {
        padding: 1rem !important;
      }

      .edit-product-form {
        background: var(--premium-moonstone);
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
      }

      .product-name {
        font-weight: 600;
        color: var(--premium-onyx);
      }

      .product-sku code {
        background: rgba(183, 110, 121, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--premium-rose-gold);
      }

      .product-description {
        color: var(--premium-titanium);
        font-size: 0.875rem;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-category {
        color: var(--premium-onyx);
        font-weight: 500;
      }

      .product-price strong {
        color: #10b981;
        font-size: 1.125rem;
      }

      .product-inventory span {
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.875rem;
      }

      .inventory-good {
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
      }

      .inventory-low {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
      }

      .inventory-out {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }

      .status-badge {
        padding: 0.375rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .status-in-stock {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .status-out-of-stock {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }


      .pagination-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: flex-end;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--premium-silver);
      }

      .page-info {
        color: var(--premium-titanium);
        font-weight: 600;
      }

      .page-size-label {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--premium-titanium);
        font-size: 0.875rem;
      }

      .page-size-select {
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        font-size: 0.875rem;
        transition: all 0.2s;
      }

      .page-size-select:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .loading-state,
      .error-state,
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--premium-titanium);
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--premium-silver);
        border-top-color: var(--premium-rose-gold);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .error-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
      }

      .error-state p {
        margin: 0 0 1rem;
        color: #ef4444;
        font-weight: 600;
      }

      .empty-icon {
        font-size: 3.5rem;
        margin-bottom: 1rem;
        opacity: 0.6;
      }

      .empty-state h3 {
        margin: 0 0 0.5rem;
        color: var(--premium-onyx);
        font-size: 1.5rem;
      }

      .empty-state p {
        margin: 0 0 1.5rem;
        color: var(--premium-titanium);
      }

      @media (max-width: 768px) {
        .products-page {
          padding: 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .search-input {
          min-width: 100%;
        }

        .table-container {
          overflow-x: scroll;
        }
      }
    `,
  ],
})
export class ProductsComponent implements OnInit {
  products$!: Observable<ProductListResponse>;
  form!: FormGroup;
  editForm!: FormGroup;
  private readonly search$ = new BehaviorSubject<string | undefined>(undefined);
  private readonly categoryFilter$ = new BehaviorSubject<string>('');
  private readonly stockFilter$ = new BehaviorSubject<'all' | 'in' | 'low' | 'out'>('all');
  private readonly page$ = new BehaviorSubject<number>(1);
  private readonly pageSize$ = new BehaviorSubject<number>(20);
  private readonly refreshTrigger$ = new BehaviorSubject<void>(undefined);
  readonly createInFlight = signal(false);
  readonly updateInFlight = signal(false);
  readonly editingProductId = signal<string | null>(null);
  readonly showAddForm = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal<string>('');
  readonly categoryFilter = signal<string>('');
  readonly stockFilter = signal<'all' | 'in' | 'low' | 'out'>('all');
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly pageSizeOptions = [10, 20, 50];
  readonly totalProducts = signal(0);

  readonly categories = signal<Category[]>([]);
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal<string | null>(null);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly categoryService: CategoryService,
    fb: FormBuilder,
    private readonly destroyRef: DestroyRef
  ) {
    this.form = fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      description: [''],
      imageUrl: [''], // Keep for backward compatibility
      imageUrls: [[]], // New: array of image URLs
      categoryId: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      inventory: [0, [Validators.required, Validators.min(0)]],
      // Jewelry-specific fields
      weight: [null, Validators.min(0)],
      material: [''],
      purity: [''],
      stoneType: [''],
      size: [''],
      brand: [''],
      color: [''],
      certification: [''],
      warrantyPeriod: [''],
      origin: [''],
      // Additional jewelry-specific fields
      hsnCode: [''],
      grossWeight: [null, Validators.min(0)],
      stoneWeight: [null, Validators.min(0)],
      ratePerGram: [null, Validators.min(0)],
      group: [''],
      // Pricing and calculation fields
      wastagePercent: [null, Validators.min(0)],
      metalValue: [null, Validators.min(0)],
      wastageValue: [null, Validators.min(0)],
      makingCharges: [null, Validators.min(0)],
      stoneCharges: [null, Validators.min(0)],
      gstPercent: [null, Validators.min(0)],
      gender: [''],
      readyToDeliver: [false],
    });

    this.editForm = fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      inventory: [0, [Validators.required, Validators.min(0)]],
      imageUrl: [''], // Keep for backward compatibility
      imageUrls: [[]], // New: array of image URLs
      categoryId: [''],
      // Jewelry-specific fields
      weight: [null, Validators.min(0)],
      material: [''],
      purity: [''],
      stoneType: [''],
      size: [''],
      brand: [''],
      color: [''],
      certification: [''],
      warrantyPeriod: [''],
      origin: [''],
      // Additional jewelry-specific fields
      hsnCode: [''],
      grossWeight: [null, Validators.min(0)],
      stoneWeight: [null, Validators.min(0)],
      ratePerGram: [null, Validators.min(0)],
      group: [''],
      // Pricing and calculation fields
      wastagePercent: [null, Validators.min(0)],
      metalValue: [null, Validators.min(0)],
      wastageValue: [null, Validators.min(0)],
      makingCharges: [null, Validators.min(0)],
      stoneCharges: [null, Validators.min(0)],
      gstPercent: [null, Validators.min(0)],
      gender: [''],
      readyToDeliver: [false],
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.products$ = combineLatest([
      this.search$,
      this.categoryFilter$,
      this.stockFilter$,
      this.page$,
      this.pageSize$,
      this.refreshTrigger$,
    ]).pipe(
      tap(() => {
        untracked(() => {
          this.loading.set(true);
          this.error.set(null);
        });
      }),
      switchMap(([term, categoryId, stockFilter, page, pageSize, _refresh]) => {
        untracked(() => {
          this.searchTerm.set(term || '');
        });
        return this.catalogService.listProducts(page, pageSize, term).pipe(
          map((response) => this.applyProductFilters(response, categoryId, stockFilter)),
          catchError((err) => {
            untracked(() => {
              this.error.set(err.error?.detail || 'Failed to load products');
            });
            return of({ items: [], total: 0, page, pageSize });
          })
        );
      }),
      tap((response) => {
        untracked(() => {
          this.loading.set(false);
          this.totalProducts.set(response.total);
          if (this.page() !== response.page) {
            this.page.set(response.page);
          }
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  loadProducts(): void {
    this.refreshTrigger$.next(undefined);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const term = target.value.trim();
    this.searchTerm.set(term);
    this.search$.next(term || undefined);
    this.resetPagination();
  }

  onCategoryFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.categoryFilter.set(value);
    this.categoryFilter$.next(value);
    this.resetPagination();
  }

  onStockFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value as 'all' | 'in' | 'low' | 'out';
    this.stockFilter.set(value);
    this.stockFilter$.next(value);
    this.resetPagination();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.search$.next(undefined);
    this.categoryFilter.set('');
    this.categoryFilter$.next('');
    this.stockFilter.set('all');
    this.stockFilter$.next('all');
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
    const size = Number((event.target as HTMLSelectElement).value);
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
      this.loadProducts();
    }
  }

  createProduct(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }
    this.createInFlight.set(true);
    this.catalogService
      .createProduct({
        name: this.form.value.name,
        sku: this.form.value.sku,
        description: this.form.value.description || undefined,
        imageUrl: this.form.value.imageUrl || undefined, // Keep for backward compatibility
        imageUrls: this.form.value.imageUrls && this.form.value.imageUrls.length > 0 ? this.form.value.imageUrls.filter((url: string) => url.trim() !== '') : undefined,
        categoryId: this.form.value.categoryId || undefined,
        price: { currency: 'INR', amount: this.form.value.price },
        inventory: this.form.value.inventory,
        weight: this.form.value.weight || undefined,
        material: this.form.value.material || undefined,
        purity: this.form.value.purity || undefined,
        stoneType: this.form.value.stoneType || undefined,
        size: this.form.value.size || undefined,
        brand: this.form.value.brand || undefined,
        color: this.form.value.color || undefined,
        certification: this.form.value.certification || undefined,
        warrantyPeriod: this.form.value.warrantyPeriod || undefined,
        origin: this.form.value.origin || undefined,
        hsnCode: this.form.value.hsnCode || undefined,
        grossWeight: this.form.value.grossWeight || undefined,
        stoneWeight: this.form.value.stoneWeight || undefined,
        ratePerGram: this.form.value.ratePerGram || undefined,
        group: this.form.value.group || undefined,
        wastagePercent: this.form.value.wastagePercent || undefined,
        metalValue: this.form.value.metalValue || undefined,
        wastageValue: this.form.value.wastageValue || undefined,
        makingCharges: this.form.value.makingCharges || undefined,
        stoneCharges: this.form.value.stoneCharges || undefined,
        gstPercent: this.form.value.gstPercent || undefined,
        gender: this.form.value.gender || undefined,
        readyToDeliver: this.form.value.readyToDeliver === true || this.form.value.readyToDeliver === 'true',
      })
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.detail || 'Failed to create product');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (product) => {
          if (product) {
            this.form.reset();
            this.showAddForm.set(false);
            this.loadProducts();
          }
          this.createInFlight.set(false);
        },
        error: () => {
          this.createInFlight.set(false);
        },
      });
  }

  cancelAdd(): void {
    this.form.reset();
    this.showAddForm.set(false);
  }

  startEdit(product: Product): void {
    this.editingProductId.set(product.id);
    this.editForm.patchValue({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      imageUrl: product.imageUrl || '', // Keep for backward compatibility
      imageUrls: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []),
      categoryId: product.categoryId || '',
      price: product.price.amount,
      inventory: product.inventory,
      weight: product.weight || null,
      material: product.material || '',
      purity: product.purity || '',
      stoneType: product.stoneType || '',
      size: product.size || '',
      brand: product.brand || '',
      color: product.color || '',
      certification: product.certification || '',
      warrantyPeriod: product.warrantyPeriod || '',
      origin: product.origin || '',
      hsnCode: product.hsnCode || '',
      grossWeight: product.grossWeight || null,
      stoneWeight: product.stoneWeight || null,
      ratePerGram: product.ratePerGram || null,
      group: product.group || '',
      wastagePercent: product.wastagePercent || null,
      metalValue: product.metalValue || null,
      wastageValue: product.wastageValue || null,
      makingCharges: product.makingCharges || null,
      stoneCharges: product.stoneCharges || null,
      gstPercent: product.gstPercent || null,
      gender: product.gender || '',
      readyToDeliver: product.readyToDeliver || false,
    });
  }

  cancelEdit(): void {
    this.editingProductId.set(null);
    this.editForm.reset();
  }

  getEditImageUrls(): string[] {
    const imageUrlsValue = this.editForm.get('imageUrls')?.value || [];
    const imageUrlValue = this.editForm.get('imageUrl')?.value || '';
    
    if (imageUrlsValue && imageUrlsValue.length > 0) {
      return imageUrlsValue;
    }
    if (imageUrlValue) {
      return [imageUrlValue];
    }
    return [];
  }

  onEditImagesChange(urls: string[]): void {
    this.editForm.patchValue({
      imageUrls: urls,
      imageUrl: urls.length > 0 ? urls[0] : '', // Keep first as primary for backward compatibility
    });
  }

  updateProduct(productId: string): void {
    if (this.editForm.invalid) {
      Object.keys(this.editForm.controls).forEach((key) => {
        this.editForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.updateInFlight.set(true);
    this.catalogService
      .updateProduct(productId, {
        name: this.editForm.value.name,
        sku: this.editForm.value.sku,
        description: this.editForm.value.description || undefined,
        imageUrl: this.editForm.value.imageUrl || undefined, // Keep for backward compatibility
        imageUrls: this.editForm.value.imageUrls && this.editForm.value.imageUrls.length > 0 ? this.editForm.value.imageUrls.filter((url: string) => url.trim() !== '') : undefined,
        categoryId: this.editForm.value.categoryId || undefined,
        price: { currency: 'INR', amount: this.editForm.value.price },
        inventory: this.editForm.value.inventory,
        weight: this.editForm.value.weight || undefined,
        material: this.editForm.value.material || undefined,
        purity: this.editForm.value.purity || undefined,
        stoneType: this.editForm.value.stoneType || undefined,
        size: this.editForm.value.size || undefined,
        brand: this.editForm.value.brand || undefined,
        color: this.editForm.value.color || undefined,
        certification: this.editForm.value.certification || undefined,
        warrantyPeriod: this.editForm.value.warrantyPeriod || undefined,
        origin: this.editForm.value.origin || undefined,
        hsnCode: this.editForm.value.hsnCode || undefined,
        grossWeight: this.editForm.value.grossWeight || undefined,
        stoneWeight: this.editForm.value.stoneWeight || undefined,
        ratePerGram: this.editForm.value.ratePerGram || undefined,
        group: this.editForm.value.group || undefined,
        wastagePercent: this.editForm.value.wastagePercent || undefined,
        metalValue: this.editForm.value.metalValue || undefined,
        wastageValue: this.editForm.value.wastageValue || undefined,
        makingCharges: this.editForm.value.makingCharges || undefined,
        stoneCharges: this.editForm.value.stoneCharges || undefined,
        gstPercent: this.editForm.value.gstPercent || undefined,
        gender: this.editForm.value.gender || undefined,
        readyToDeliver: this.editForm.value.readyToDeliver === true || this.editForm.value.readyToDeliver === 'true',
      })
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.detail || 'Failed to update product');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (product) => {
          if (product) {
            this.editingProductId.set(null);
            this.editForm.reset();
            this.loadProducts();
          }
          this.updateInFlight.set(false);
        },
        error: () => {
          this.updateInFlight.set(false);
        },
      });
  }

  getCategoryName(categoryId?: string): string {
    if (!categoryId) {
      return 'Unassigned';
    }
    const match = this.categories().find((category) => category.id === categoryId);
    return match ? match.name : 'Unassigned';
  }

  private applyProductFilters(
    response: ProductListResponse,
    categoryId: string,
    stockFilter: 'all' | 'in' | 'low' | 'out'
  ): ProductListResponse {
    const filteredItems = response.items.filter((product) => {
      const matchesCategory = !categoryId || product.categoryId === categoryId;
      let matchesStock = true;
      if (stockFilter === 'in') {
        matchesStock = product.inventory > 0;
      } else if (stockFilter === 'low') {
        matchesStock = product.inventory > 0 && product.inventory <= 5;
      } else if (stockFilter === 'out') {
        matchesStock = product.inventory === 0;
      }
      return matchesCategory && matchesStock;
    });

    return {
      ...response,
      items: filteredItems,
    };
  }

  private loadCategories(): void {
    untracked(() => {
      this.categoriesLoading.set(true);
      this.categoriesError.set(null);
    });
    this.categoryService
      .listCategories(true)
      .pipe(
        map((response) => response.items),
        catchError((err) => {
          untracked(() => {
            this.categoriesError.set(err.error?.detail || 'Failed to load categories');
          });
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((items) => {
        untracked(() => {
          this.categories.set(items);
          this.categoriesLoading.set(false);
        });
      });
  }
}
