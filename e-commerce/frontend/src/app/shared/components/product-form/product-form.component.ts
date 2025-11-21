import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import type { Category } from '../../../shared/models/category';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, ImageUploadComponent],
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
      <div class="form-row full-width">
        <label>
          <span>Product Images</span>
          <app-image-upload
            [formControl]="form.get('imageUrls')!"
            (imagesChange)="onImagesChange($event)"
          ></app-image-upload>
          <small>Add multiple images by URL or upload files. Supported formats: JPG, PNG, WebP, GIF (max 5MB each).</small>
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

      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-weight: 600;
        color: var(--premium-onyx);
        font-size: 0.9rem;
      }

      input[type='text'],
      input[type='number'],
      input[type='url'],
      input[type='email'],
      select,
      textarea {
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
        transition: all 0.2s;
      }

      input:focus,
      select:focus,
      textarea:focus {
        outline: none;
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
        padding: 0.75rem 1.5rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary:hover:not(:disabled) {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }

      .full-width {
        grid-column: 1 / -1;
      }

    `,
  ],
})
export class ProductFormComponent implements OnInit, OnChanges {
  @Input() form!: FormGroup;
  @Input() categories: Category[] = [];
  @Input() loading = false;
  @Input() submitLabel = 'Create Product';
  @Output() submit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  ngOnInit(): void {
    this.syncImageUrls();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form'] && this.form) {
      this.syncImageUrls();
    }
  }

  syncImageUrls(): void {
    if (this.form) {
      const imageUrlsValue = this.form.get('imageUrls')?.value || [];
      const imageUrlValue = this.form.get('imageUrl')?.value || '';
      
      if (imageUrlsValue && imageUrlsValue.length > 0) {
        this.form.get('imageUrls')?.setValue(imageUrlsValue);
      } else if (imageUrlValue) {
        this.form.get('imageUrls')?.setValue([imageUrlValue]);
      } else {
        this.form.get('imageUrls')?.setValue([]);
      }
    }
  }

  getImageUrls(): string[] {
    const imageUrlsValue = this.form.get('imageUrls')?.value || [];
    const imageUrlValue = this.form.get('imageUrl')?.value || '';
    
    if (imageUrlsValue && imageUrlsValue.length > 0) {
      return imageUrlsValue;
    }
    if (imageUrlValue) {
      return [imageUrlValue];
    }
    return [];
  }

  onImagesChange(urls: string[]): void {
    this.form.patchValue({
      imageUrls: urls,
      imageUrl: urls.length > 0 ? urls[0] : '', // Keep first as primary for backward compatibility
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.submit.emit();
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}

