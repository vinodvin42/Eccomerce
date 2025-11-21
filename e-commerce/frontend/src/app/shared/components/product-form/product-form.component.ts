import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import type { Category } from '../../../shared/models/category';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="product-form">
      <div class="form-row">
        <label>
          <span>Product Name *</span>
          <input formControlName="name" type="text" placeholder="Enter product name" />
          <small *ngIf="form.get('name')?.invalid && form.get('name')?.touched">
            Product name is required
          </small>
        </label>
        <label>
          <span>SKU *</span>
          <input formControlName="sku" type="text" placeholder="Enter SKU" />
          <small *ngIf="form.get('sku')?.invalid && form.get('sku')?.touched">
            SKU is required
          </small>
        </label>
        <label>
          <span>Category</span>
          <select formControlName="categoryId">
            <option value="">Unassigned</option>
            <option *ngFor="let category of categories" [value]="category.id">
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
      <div class="form-row">
        <label>
          <span>Image URL</span>
          <input formControlName="imageUrl" type="url" placeholder="https://example.com/image.jpg" />
          <small>Enter a URL to an image for this product</small>
        </label>
      </div>
      <div class="form-row">
        <label>
          <span>Price (₹) *</span>
          <input formControlName="price" type="number" step="0.01" min="0" placeholder="0.00" />
          <small *ngIf="form.get('price')?.invalid && form.get('price')?.touched">
            Valid price is required
          </small>
        </label>
        <label>
          <span>Inventory *</span>
          <input formControlName="inventory" type="number" min="0" placeholder="0" />
          <small *ngIf="form.get('inventory')?.invalid && form.get('inventory')?.touched">
            Valid inventory count is required
          </small>
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
          <span>Other Charges (₹)</span>
          <input formControlName="otherCharges" type="number" step="0.01" min="0" placeholder="0.00" />
        </label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" (click)="onCancel()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
          {{ submitLabel }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .product-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
    `,
  ],
})
export class ProductFormComponent {
  @Input() form!: FormGroup;
  @Input() categories: Category[] = [];
  @Input() loading = false;
  @Input() submitLabel = 'Create Product';
  @Output() submit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onSubmit() {
    if (this.form.valid) {
      this.submit.emit();
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}

