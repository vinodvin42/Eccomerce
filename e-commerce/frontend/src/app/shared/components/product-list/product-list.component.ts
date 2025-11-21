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
      .product-name {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .product-name small {
        color: var(--premium-titanium);
        font-size: 0.875rem;
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

