import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, catchError, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { CatalogService } from '../../core/services/catalog.service';
import { CategoryService } from '../../core/services/category.service';
import { CartActions } from '../../state/cart/cart.actions';
import type { AppState } from '../../state';
import type { Product } from '../../shared/models/catalog';
import { BrandingService } from '../../core/services/branding.service';
import { calculateProductPrice } from '../../core/utils/price-calculator';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, CurrencyPipe, RouterLink, FormsModule],
  template: `
    <div class="page-container-narrow">
      <ng-container *ngIf="product$ | async as product; else loadingState">
        <header class="product-heading">
          <div>
            <h1>{{ product.name }}</h1>
            <p>Discover the elegance and craftsmanship of this piece.</p>
          </div>
          <a routerLink="/store" class="link-soft">← Continue Shopping</a>
        </header>

        <div class="product-grid">
          <div class="product-main">
            <section class="product-card">
              <div class="product-image-section">
                <div class="product-image-gallery">
                  <div class="main-image-container" (click)="openZoomView()">
                    <button 
                      *ngIf="getAllImages(product).length > 1 && selectedImageIndex > 0"
                      type="button"
                      class="nav-button nav-prev"
                      (click)="previousImageInZoom($event, product)"
                      title="Previous image"
                    >
                      ‹
                    </button>
                    <div class="main-image-wrapper">
                      <img
                        *ngIf="getMainImage(product) && !imageError"
                        [src]="getMainImage(product)"
                        [alt]="product.name"
                        (error)="onImageError()"
                        class="main-image"
                        [class.zoom-enabled]="getAllImages(product).length > 0"
                      />
                      <div class="image-placeholder" *ngIf="!getMainImage(product) || imageError">
                        <span class="image-icon">{{ product.name.charAt(0) }}</span>
                      </div>
                      <div class="zoom-hint" *ngIf="getAllImages(product).length > 0 && !imageError">
                        <span>🔍 Click to zoom</span>
                      </div>
                    </div>
                    <button 
                      *ngIf="getAllImages(product).length > 1 && selectedImageIndex < getAllImages(product).length - 1"
                      type="button"
                      class="nav-button nav-next"
                      (click)="nextImageInZoom($event, product)"
                      title="Next image"
                    >
                      ›
                    </button>
                    <div class="image-counter" *ngIf="getAllImages(product).length > 1">
                      {{ selectedImageIndex + 1 }} / {{ getAllImages(product).length }}
                    </div>
                  </div>
                  <div class="image-thumbnails" *ngIf="getAllImages(product).length > 1">
                    <button
                      *ngFor="let img of getAllImages(product); let i = index"
                      type="button"
                      class="thumbnail"
                      [class.active]="selectedImageIndex === i"
                      (click)="selectImage(i)"
                    >
                      <img [src]="img" [alt]="product.name + ' - Image ' + (i + 1)" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="product-details">
                <div class="product-header-info">
                  <span class="category-pill">{{ categoryName }}</span>
                  <p class="product-sku">SKU: {{ product.sku }}</p>
                </div>

                <div class="price-section">
                  <span class="price">{{ getFinalPrice(product, 1) | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                  <span *ngIf="product.inventory <= 5 && product.inventory > 0" class="stock-badge warning">
                    Only {{ product.inventory }} left
                  </span>
                  <span *ngIf="product.inventory === 0" class="stock-badge danger">Out of stock</span>
                  <span *ngIf="product.inventory > 5" class="stock-badge success">In stock</span>
                </div>

                <div class="product-description" *ngIf="product.description" [innerHTML]="formatDescription(product.description)"></div>

                <div class="product-specs">
                  <h3>Product Details</h3>
                  <div class="specs-grid">
                    <div class="spec-item">
                      <span class="spec-label">Category</span>
                      <span class="spec-value">{{ categoryName }}</span>
                    </div>
                    <div class="spec-item">
                      <span class="spec-label">Availability</span>
                      <span class="spec-value">{{ product.inventory > 0 ? 'In Stock' : 'Out of Stock' }}</span>
                    </div>
                    <div class="spec-item">
                      <span class="spec-label">Inventory</span>
                      <span class="spec-value">{{ product.inventory }} units</span>
                    </div>
                    <div class="spec-item" *ngIf="product.material">
                      <span class="spec-label">Material</span>
                      <span class="spec-value">{{ product.material }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.purity">
                      <span class="spec-label">Purity</span>
                      <span class="spec-value">{{ product.purity }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.stoneType">
                      <span class="spec-label">Stone Type</span>
                      <span class="spec-value">{{ product.stoneType }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.weight">
                      <span class="spec-label">Weight</span>
                      <span class="spec-value">{{ product.weight }}g</span>
                    </div>
                    <div class="spec-item" *ngIf="product.size">
                      <span class="spec-label">Size</span>
                      <span class="spec-value">{{ product.size }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.color">
                      <span class="spec-label">Color</span>
                      <span class="spec-value">{{ product.color }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.brand">
                      <span class="spec-label">Brand</span>
                      <span class="spec-value">{{ product.brand }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.certification">
                      <span class="spec-label">Certification</span>
                      <span class="spec-value">{{ product.certification }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.warrantyPeriod">
                      <span class="spec-label">Warranty</span>
                      <span class="spec-value">{{ product.warrantyPeriod }}</span>
                    </div>
                    <div class="spec-item" *ngIf="product.origin">
                      <span class="spec-label">Origin</span>
                      <span class="spec-value">{{ product.origin }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside class="action-panel">
            <div class="action-card">
              <div class="action-header">
                <h3>Add to Cart</h3>
                <p class="action-subtitle">Select quantity and proceed</p>
              </div>

              <div class="quantity-section">
                <span class="quantity-label">Quantity</span>
                <div class="qty-group">
                  <button type="button" (click)="quantity = Math.max(1, quantity - 1)" [disabled]="quantity <= 1">−</button>
                  <span>{{ quantity }}</span>
                  <button type="button" (click)="quantity = quantity + 1" [disabled]="product.inventory === 0 || quantity >= product.inventory">+</button>
                </div>
              </div>

              <div class="price-breakdown" *ngIf="hasPricingDetails(product)">
                <div class="breakdown-item" *ngIf="getPriceBreakdown(product, quantity).metalValue > 0">
                  <span>Metal Value:</span>
                  <span>{{ getPriceBreakdown(product, quantity).metalValue | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                </div>
                <div class="breakdown-item" *ngIf="getPriceBreakdown(product, quantity).wastageValue > 0">
                  <span>Wastage Value:</span>
                  <span>{{ getPriceBreakdown(product, quantity).wastageValue | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                </div>
                <div class="breakdown-item" *ngIf="getPriceBreakdown(product, quantity).makingCharges > 0">
                  <span>Making Charges:</span>
                  <span>{{ getPriceBreakdown(product, quantity).makingCharges | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                </div>
                <div class="breakdown-item" *ngIf="getPriceBreakdown(product, quantity).stoneCharges > 0">
                  <span>Stone Charges:</span>
                  <span>{{ getPriceBreakdown(product, quantity).stoneCharges | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                </div>
                <div class="breakdown-item breakdown-subtotal">
                  <span>Subtotal:</span>
                  <span>{{ getPriceBreakdown(product, quantity).subtotal | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                </div>
                <div class="breakdown-item" *ngIf="getPriceBreakdown(product, quantity).gstAmount > 0">
                  <span>GST ({{ product.gstPercent || 0 }}%):</span>
                  <span>{{ getPriceBreakdown(product, quantity).gstAmount | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                </div>
              </div>
              <div class="action-total">
                <span>Final Price:</span>
                <strong>{{ getFinalPrice(product, quantity) | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</strong>
              </div>

              <button class="btn-primary" (click)="addToCart(product)" [disabled]="product.inventory === 0 || quantity < 1">
                Add to Cart
              </button>

              <button class="btn-secondary" (click)="buyItNow(product)" [disabled]="product.inventory === 0 || quantity < 1">
                Buy it now
              </button>

              <div class="assurance-info">
                <h4>Why {{ (tenantBrand$ | async) ?? 'Premium Jewelry' }}?</h4>
                <ul>
                  <li>Complimentary insured shipping</li>
                  <li>Lifetime cleaning & resizing</li>
                  <li>Authenticity certificate included</li>
                </ul>
              </div>

              <p class="action-note">Secure checkout • 60-day returns • Lifetime support</p>
            </div>
          </aside>
        </div>
        
        <!-- Zoom Modal - Full screen overlay -->
        <div class="zoom-modal" *ngIf="zoomOpen" (click)="closeZoomView()" (keydown)="handleZoomKeyboard($event, product)">
          <button class="zoom-close" (click)="closeZoomView()" title="Close (ESC)">×</button>
          <div class="zoom-content" (click)="$event.stopPropagation()">
            <button 
              *ngIf="getAllImages(product).length > 1 && selectedImageIndex > 0"
              type="button"
              class="zoom-nav zoom-prev"
              (click)="previousImageInZoom($event, product)"
              title="Previous image"
            >
              ‹
            </button>
            <div class="zoom-image-wrapper">
              <img
                [src]="getMainImage(product)"
                [alt]="product.name"
                class="zoom-image"
              />
              <div class="zoom-counter" *ngIf="getAllImages(product).length > 1">
                {{ selectedImageIndex + 1 }} / {{ getAllImages(product).length }}
              </div>
            </div>
            <button 
              *ngIf="getAllImages(product).length > 1 && selectedImageIndex < getAllImages(product).length - 1"
              type="button"
              class="zoom-nav zoom-next"
              (click)="nextImageInZoom($event, product)"
              title="Next image"
            >
              ›
            </button>
            <div class="zoom-thumbnails" *ngIf="getAllImages(product).length > 1">
              <button
                *ngFor="let img of getAllImages(product); let i = index"
                type="button"
                class="zoom-thumbnail"
                [class.active]="selectedImageIndex === i"
                (click)="selectImage(i)"
              >
                <img [src]="img" [alt]="product.name + ' - Image ' + (i + 1)" />
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #loadingState>
        <div class="loading">Loading product...</div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .product-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--premium-silver);
        margin-bottom: 1.5rem;
      }
      .product-heading h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 500;
        color: var(--premium-onyx);
      }
      .product-heading p {
        margin: 0.3rem 0 0;
        color: var(--premium-titanium);
        font-size: 0.95rem;
      }
      .link-soft {
        color: var(--premium-rose-gold);
        text-decoration: none;
        font-weight: 600;
      }
      .product-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 1.5rem;
      }
      .product-main {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .product-image-section {
        margin-bottom: 1.5rem;
      }
      .product-image-gallery {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .main-image-container {
        width: 100%;
        height: 500px;
        border: 1px solid var(--premium-silver);
        border-radius: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--premium-moonstone);
        overflow: hidden;
        box-shadow: 0 10px 30px var(--premium-shadow);
        position: relative;
        cursor: pointer;
      }
      .main-image-wrapper {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .main-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: opacity 0.3s ease;
      }
      .main-image.zoom-enabled {
        cursor: zoom-in;
      }
      .zoom-hint {
        position: absolute;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        white-space: nowrap;
      }
      .main-image-container:hover .zoom-hint {
        opacity: 1;
      }
      .nav-button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.95);
        border: none;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        font-weight: 300;
        line-height: 1;
        color: var(--premium-onyx);
        cursor: pointer;
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.2s ease;
        padding: 0;
        margin: 0;
      }
      .nav-button:hover {
        background: #fff;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        transform: translateY(-50%) scale(1.1);
      }
      .nav-button:active {
        transform: translateY(-50%) scale(0.95);
      }
      .nav-prev {
        left: 1rem;
      }
      .nav-next {
        right: 1rem;
      }
      .image-counter {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        z-index: 10;
        white-space: nowrap;
      }
      .image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--premium-titanium);
      }
      .image-icon {
        font-size: 4rem;
        font-weight: 600;
      }
      .image-thumbnails {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        justify-content: center;
      }
      .thumbnail {
        width: 80px;
        height: 80px;
        border: 2px solid var(--premium-silver);
        border-radius: 0.5rem;
        padding: 0;
        background: var(--premium-moonstone);
        cursor: pointer;
        overflow: hidden;
        transition: all 0.3s ease;
        position: relative;
      }
      .thumbnail:hover {
        border-color: var(--premium-gold);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      }
      .thumbnail.active {
        border-color: var(--premium-rose-gold);
        border-width: 3px;
        box-shadow: 0 0 0 2px rgba(183, 110, 121, 0.2);
      }
      .thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .product-details {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .product-header-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .category-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.35rem 0.9rem;
        border-radius: 999px;
        background: rgba(212, 175, 55, 0.12);
        color: var(--premium-rose-gold);
        font-weight: 600;
        font-size: 0.85rem;
      }
      .product-sku {
        margin: 0;
        color: #9ca3af;
        font-family: 'Space Mono', monospace;
        letter-spacing: 0.1em;
        font-size: 0.85rem;
      }
      .price-section {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .price {
        font-size: 2rem;
        font-weight: 700;
        color: var(--premium-onyx);
      }
      .stock-badge {
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .stock-badge.warning {
        background: rgba(212, 175, 55, 0.12);
        color: var(--premium-gold);
      }
      .stock-badge.danger {
        background: rgba(183, 110, 121, 0.12);
        color: var(--premium-rose-gold);
      }
      .stock-badge.success {
        color: #067d62;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .product-description {
        color: #1a1a1a;
        line-height: 1.8;
        font-size: 0.95rem;
        margin: 1.5rem 0;
      }

      .product-description .desc-heading {
        margin: 1.5rem 0 0.75rem 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: #1a1a1a;
        line-height: 1.4;
      }

      .product-description .desc-heading:first-child {
        margin-top: 0;
      }

      .product-description p {
        margin: 0 0 1rem 0;
        color: #4a4a4a;
        line-height: 1.8;
      }

      .product-description .desc-list {
        margin: 0.75rem 0 1rem 1.5rem;
        padding: 0;
        list-style: none;
      }

      .product-description .desc-list li {
        margin: 0.5rem 0;
        color: #4a4a4a;
        line-height: 1.7;
        position: relative;
        padding-left: 1.25rem;
      }

      .product-description .desc-list li::before {
        content: '•';
        position: absolute;
        left: 0;
        color: var(--premium-gold);
        font-weight: 700;
        font-size: 1.2rem;
      }
      .product-specs {
        padding-top: 1.25rem;
        border-top: 1px solid #e3e6e6;
      }
      .product-specs h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--premium-onyx);
      }
      .specs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }
      .spec-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .spec-label {
        font-size: 0.8rem;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .spec-value {
        font-size: 1rem;
        color: #1f2937;
        font-weight: 600;
      }
      .action-panel {
        position: sticky;
        top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: fit-content;
      }
      .action-header {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--premium-silver);
      }
      .action-header h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--premium-onyx);
      }
      .action-subtitle {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 0.9rem;
      }
      .quantity-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }
      .quantity-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--premium-titanium);
        text-align: center;
      }
      .qty-group {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d5d9d9;
        border-radius: 24px;
        overflow: hidden;
        margin: 0 auto;
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
      .price-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--premium-silver);
      }
      .breakdown-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        color: var(--premium-titanium);
      }
      .breakdown-item.breakdown-subtotal {
        font-weight: 600;
        color: var(--premium-onyx);
        margin-top: 0.25rem;
        padding-top: 0.5rem;
        border-top: 1px solid var(--premium-silver);
      }
      .action-total {
        display: flex;
        justify-content: space-between;
        font-size: 1rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--premium-silver);
      }
      .action-total strong {
        font-size: 1.25rem;
        color: var(--premium-onyx);
      }
      .action-card .btn-primary {
        width: 100%;
        margin-bottom: 0.75rem;
        font-size: 1rem;
      }

      .action-card .btn-secondary {
        width: 100%;
        margin-bottom: 1.5rem;
        font-size: 1rem;
        background: transparent;
        color: var(--premium-rose-gold);
      }
      .assurance-info {
        padding-top: 1.5rem;
        border-top: 1px solid var(--premium-silver);
        margin-bottom: 1rem;
      }
      .assurance-info h4 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--premium-onyx);
      }
      .assurance-info ul {
        margin: 0;
        padding-left: 1.25rem;
        color: var(--premium-titanium);
        font-size: 0.9rem;
        line-height: 1.8;
      }
      .action-note {
        margin: 1rem 0 0;
        font-size: 0.85rem;
        color: var(--premium-titanium);
        text-align: center;
      }
      .loading {
        text-align: center;
        padding: 5rem 1rem;
        color: #9ca3af;
      }
      /* Zoom Modal Styles */
      .zoom-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .zoom-close {
        position: absolute;
        top: 2rem;
        right: 2rem;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        font-size: 2rem;
        font-weight: 300;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        z-index: 10000;
        padding: 0;
        margin: 0;
      }
      .zoom-close:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
        transform: scale(1.1);
      }
      .zoom-content {
        position: relative;
        width: 90%;
        max-width: 1200px;
        height: 90vh;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2rem;
      }
      .zoom-image-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .zoom-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      .zoom-counter {
        position: absolute;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
      }
      .zoom-nav {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        font-size: 2.5rem;
        font-weight: 300;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        padding: 0;
        margin: 0;
      }
      .zoom-nav:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
        transform: scale(1.1);
      }
      .zoom-thumbnails {
        position: absolute;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.75rem;
        background: rgba(0, 0, 0, 0.5);
        padding: 1rem;
        border-radius: 1rem;
        backdrop-filter: blur(10px);
      }
      .zoom-thumbnail {
        width: 60px;
        height: 60px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 0.5rem;
        padding: 0;
        background: rgba(255, 255, 255, 0.1);
        cursor: pointer;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      .zoom-thumbnail:hover {
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.1);
      }
      .zoom-thumbnail.active {
        border-color: var(--premium-gold);
        border-width: 3px;
        box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.3);
      }
      .zoom-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      @media (max-width: 960px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
        .action-panel {
          position: static;
        }
        .main-image-container {
          height: 400px;
        }
        .thumbnail {
          width: 60px;
          height: 60px;
        }
        .nav-button {
          width: 2.5rem;
          height: 2.5rem;
          font-size: 1.5rem;
          line-height: 1;
        }
        .nav-prev {
          left: 0.5rem;
        }
        .nav-next {
          right: 0.5rem;
        }
        .zoom-content {
          width: 95%;
          height: 95vh;
          gap: 1rem;
        }
        .zoom-nav {
          width: 3rem;
          height: 3rem;
          font-size: 2rem;
          line-height: 1;
        }
        .zoom-thumbnails {
          bottom: 1rem;
          padding: 0.75rem;
          gap: 0.5rem;
        }
        .zoom-thumbnail {
          width: 50px;
          height: 50px;
        }
        .zoom-close {
          top: 1rem;
          right: 1rem;
          width: 2.5rem;
          height: 2.5rem;
          font-size: 1.75rem;
          line-height: 1;
        }
      }
    `,
  ],
})
export class ProductDetailComponent implements OnInit {
  product$!: Observable<Product | null>;
  quantity = 1;
  categoryName = 'All Collections';
  imageError = false;
  selectedImageIndex = 0;
  zoomOpen = false;
  tenantBrand$ = this.brandingService.tenantBrandChanges$;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly catalogService: CatalogService,
    private readonly categoryService: CategoryService,
    private readonly store: Store<AppState>,
    private readonly router: Router,
    private readonly brandingService: BrandingService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.product$ = this.catalogService.getProduct(productId).pipe(
        tap((product) => {
          this.imageError = false;
          this.resolveCategory(product?.categoryId);
        }),
        catchError(() => {
          this.router.navigate(['/store']);
          return of(null);
        })
      );
    }
  }

  addToCart(product: Product): void {
    if (product.inventory > 0 && this.quantity > 0) {
      // Calculate final price using all pricing fields (for 1 unit to get per-unit values)
      const breakdownPerUnit = calculateProductPrice(product, 1);
      // Calculate total for the quantity
      const breakdownTotal = calculateProductPrice(product, this.quantity);
      const finalPrice = {
        currency: breakdownTotal.currency,
        amount: breakdownTotal.finalPrice,
      };
      
      this.store.dispatch(
        CartActions.addItem({
          productId: product.id,
          name: product.name,
          price: finalPrice,
          quantity: this.quantity,
          imageUrl: product.imageUrl,
          sku: product.sku,
          inventory: product.inventory, // Store inventory
          priceBreakdown: {
            // Store per-unit values so we can multiply by quantity later
            metalValue: breakdownPerUnit.metalValue,
            wastageValue: breakdownPerUnit.wastageValue,
            makingCharges: breakdownPerUnit.makingCharges,
            stoneCharges: breakdownPerUnit.stoneCharges,
            subtotal: breakdownPerUnit.subtotal,
            gstAmount: breakdownPerUnit.gstAmount,
            finalPrice: breakdownPerUnit.finalPrice,
          },
        })
      );
      // Optionally show a success message or navigate to cart
    }
  }

  buyItNow(product: Product): void {
    if (product.inventory > 0 && this.quantity > 0) {
      // First add to cart
      this.addToCart(product);
      // Then navigate to checkout
      this.router.navigate(['/checkout']);
    }
  }

  getPriceBreakdown(product: Product, qty: number) {
    return calculateProductPrice(product, qty);
  }

  getFinalPrice(product: Product, qty: number): number {
    return calculateProductPrice(product, qty).finalPrice;
  }

  hasPricingDetails(product: Product): boolean {
    return !!(
      product.metalValue ||
      product.wastageValue ||
      product.wastagePercent ||
      product.makingCharges ||
      product.stoneCharges ||
      product.gstPercent
    );
  }

  onImageError(): void {
    this.imageError = true;
  }

  getAllImages(product: Product): string[] {
    if (product.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    if (product.imageUrl) {
      return [product.imageUrl];
    }
    return [];
  }

  getMainImage(product: Product): string | undefined {
    const images = this.getAllImages(product);
    if (images.length > 0 && this.selectedImageIndex < images.length) {
      return images[this.selectedImageIndex];
    }
    return images[0];
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
    this.imageError = false;
  }


  openZoomView(): void {
    this.zoomOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeZoomView(): void {
    this.zoomOpen = false;
    document.body.style.overflow = '';
  }

  nextImageInZoom(event: Event, product: Product): void {
    event.stopPropagation();
    const images = this.getAllImages(product);
    if (this.selectedImageIndex < images.length - 1) {
      this.selectedImageIndex++;
      this.imageError = false;
    }
  }

  previousImageInZoom(event: Event, product: Product): void {
    event.stopPropagation();
    if (this.selectedImageIndex > 0) {
      this.selectedImageIndex--;
      this.imageError = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.zoomOpen) {
      return;
    }
    
    // Get product from observable - we'll need to handle this differently
    // For now, just handle ESC key
    if (event.key === 'Escape') {
      this.closeZoomView();
    }
  }

  handleZoomKeyboard(event: KeyboardEvent, product: Product): void {
    if (!this.zoomOpen) {
      return;
    }
    
    const images = this.getAllImages(product);
    
    if (event.key === 'Escape') {
      this.closeZoomView();
    } else if (event.key === 'ArrowLeft' && this.selectedImageIndex > 0) {
      this.selectedImageIndex--;
      this.imageError = false;
    } else if (event.key === 'ArrowRight' && this.selectedImageIndex < images.length - 1) {
      this.selectedImageIndex++;
      this.imageError = false;
    }
  }

  getFormattedDescription(description: string): SafeHtml {
    const html = this.formatDescription(description);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private formatDescription(description: string): string {
    if (!description) return '';
    
    // Split by double newlines to get major sections
    const sections = description.split(/\n\s*\n/).filter(s => s.trim());
    let formatted = '';
    
    for (const section of sections) {
      const lines = section.split('\n').map(l => l.trim());
      let i = 0;
      
      while (i < lines.length) {
        const line = lines[i];
        if (!line) {
          i++;
          continue;
        }
        
        // Check if this line is a heading (short, followed by blank line or content)
        const isHeading = line.length < 80 && 
                         (i === lines.length - 1 || 
                          lines[i + 1] === '' || 
                          (!lines[i + 1].match(/^[-•*]\s+/) && 
                           !lines[i + 1].match(/^\s{4,}/) &&
                           lines[i + 1].length > 20));
        
        if (isHeading) {
          formatted += `<h3 class="desc-heading">${this.escapeHtml(line)}</h3>`;
          i++;
          
          // Skip blank line after heading
          if (i < lines.length && lines[i] === '') {
            i++;
          }
          
          // Collect content until next heading or end
          let currentParagraph = '';
          let inList = false;
          
          while (i < lines.length) {
            const contentLine = lines[i];
            
            // Stop if we hit another heading
            if (contentLine && contentLine.length < 80 && 
                (i === lines.length - 1 || lines[i + 1] === '' || 
                 (!lines[i + 1].match(/^[-•*]\s+/) && !lines[i + 1].match(/^\s{4,}/)))) {
              break;
            }
            
            if (!contentLine) {
              // Blank line - end current paragraph or list
              if (currentParagraph) {
                formatted += `<p>${this.escapeHtml(currentParagraph)}</p>`;
                currentParagraph = '';
              }
              if (inList) {
                formatted += '</ul>';
                inList = false;
              }
              i++;
              continue;
            }
            
            // Check if it's a bullet point (starts with dash/bullet or has 4+ leading spaces)
            if (contentLine.match(/^[-•*]\s+/) || contentLine.match(/^\s{4,}/)) {
              if (!inList) {
                if (currentParagraph) {
                  formatted += `<p>${this.escapeHtml(currentParagraph)}</p>`;
                  currentParagraph = '';
                }
                formatted += '<ul class="desc-list">';
                inList = true;
              }
              // Extract bullet text
              const bulletText = contentLine.replace(/^[-•*]\s+/, '').replace(/^\s+/, '');
              formatted += `<li>${this.escapeHtml(bulletText)}</li>`;
            } else {
              // Regular text
              if (inList) {
                formatted += '</ul>';
                inList = false;
              }
              if (currentParagraph) {
                currentParagraph += ' ';
              }
              currentParagraph += contentLine;
            }
            
            i++;
          }
          
          // Close any open tags
          if (inList) {
            formatted += '</ul>';
          }
          if (currentParagraph) {
            formatted += `<p>${this.escapeHtml(currentParagraph)}</p>`;
          }
        } else {
          // Regular paragraph
          formatted += `<p>${this.escapeHtml(line)}</p>`;
          i++;
        }
      }
    }
    
    return formatted;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private resolveCategory(categoryId?: string): void {
    if (!categoryId) {
      this.categoryName = 'All Collections';
      return;
    }

    this.categoryService
      .getCategory(categoryId)
      .pipe(catchError(() => of(null)))
      .subscribe((category) => {
        this.categoryName = category?.name ?? 'All Collections';
      });
  }
}

