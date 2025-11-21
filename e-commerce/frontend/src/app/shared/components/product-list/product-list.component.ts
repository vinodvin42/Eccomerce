import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common';
import type { Product } from '../../../shared/models/catalog';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, CurrencyPipe],
  template: `
    <div class="table-container">
      <table class="products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Inventory</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let product of products" class="product-row">
            <td>
              <div class="product-name">
                <strong>{{ product.name }}</strong>
                <small *ngIf="product.description">{{ product.description }}</small>
              </div>
            </td>
            <td>
              <code>{{ product.sku }}</code>
            </td>
            <td>
              <span class="product-category">{{ getCategoryName ? getCategoryName(product.categoryId) : 'Unassigned' }}</span>
            </td>
            <td>
              <strong>{{ product.price.amount | currency : product.price.currency }}</strong>
            </td>
            <td>
              <span
                class="product-inventory"
                [ngClass]="{
                  'inventory-good': product.inventory > 10,
                  'inventory-low': product.inventory > 0 && product.inventory <= 10,
                  'inventory-out': product.inventory === 0
                }"
              >
                {{ product.inventory }}
              </span>
            </td>
            <td>
              <span
                class="status-badge"
                [ngClass]="{
                  'status-in-stock': product.inventory > 0,
                  'status-out-of-stock': product.inventory === 0
                }"
              >
                {{ product.inventory > 0 ? 'In Stock' : 'Out of Stock' }}
              </span>
            </td>
            <td>
              <button class="btn-sm" (click)="onEdit(product)">Edit</button>
              <button class="btn-sm btn-danger" (click)="onDelete(product)">Delete</button>
            </td>
          </tr>
          <tr *ngIf="products.length === 0">
            <td colspan="7" class="empty-state">
              <div class="empty-icon">📦</div>
              <h3>No products found</h3>
              <p>Get started by adding your first product.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow-x: auto;
        background: #fff;
        border-radius: 1rem;
        border: 1px solid var(--premium-silver);
        box-shadow: 0 20px 40px var(--premium-shadow);
      }

      .products-table {
        width: 100%;
        border-collapse: collapse;
      }

      th {
        background: var(--premium-moonstone);
        text-align: left;
        padding: 1rem;
        border-bottom: 2px solid var(--premium-silver);
        text-transform: uppercase;
        font-size: 0.8rem;
        color: var(--premium-titanium);
        letter-spacing: 0.08em;
        font-weight: 600;
      }

      td {
        text-align: left;
        padding: 1rem;
        border-bottom: 1px solid var(--premium-moonstone);
        color: var(--premium-onyx);
      }

      .product-row {
        cursor: pointer;
        transition: background 0.2s;
      }

      .product-row:hover {
        background: var(--premium-moonstone);
      }

      .product-name {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .product-name strong {
        color: var(--premium-onyx);
        font-weight: 600;
      }

      .product-name small {
        color: var(--premium-titanium);
        font-size: 0.875rem;
      }

      code {
        background: rgba(183, 110, 121, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--premium-rose-gold);
      }

      .product-category {
        color: var(--premium-onyx);
        font-weight: 500;
      }

      .product-inventory {
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.875rem;
        display: inline-block;
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
        display: inline-block;
      }

      .status-in-stock {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .status-out-of-stock {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .btn-sm {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
        margin-right: 0.5rem;
      }

      .btn-sm:not(.btn-danger) {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        border: 1px solid var(--premium-silver);
      }

      .btn-sm:not(.btn-danger):hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }

      .btn-sm.btn-danger {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .btn-sm.btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: #ef4444;
      }

      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--premium-titanium);
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
        margin: 0;
        color: var(--premium-titanium);
      }
    `,
  ],
})
export class ProductListComponent {
  @Input() products: Product[] = [];
  @Input() getCategoryName?: (categoryId?: string) => string;
  @Output() edit = new EventEmitter<Product>();
  @Output() delete = new EventEmitter<Product>();

  onEdit(product: Product) {
    this.edit.emit(product);
  }

  onDelete(product: Product) {
    this.delete.emit(product);
  }

}

