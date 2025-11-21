import { AsyncPipe, CurrencyPipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CatalogActions } from '../../state/catalog/catalog.actions';
import { selectCatalogItems, selectCatalogLoading } from '../../state/catalog/catalog.selectors';
import type { AppState } from '../../state';
import type { Product } from '../../shared/models/catalog';
import { CartActions } from '../../state/cart/cart.actions';
import { calculateProductPrice } from '../../core/utils/price-calculator';
import { selectCartItemCount } from '../../state/cart/cart.selectors';
import { CategoryService } from '../../core/services/category.service';
import type { Category } from '../../shared/models/category';
import { HeroSliderComponent, type HeroSlide } from '../../shared/components/hero-slider/hero-slider.component';

type AvailabilityFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

interface PriceRangeOption {
  key: string;
  label: string;
  range?: { min: number; max: number };
  description?: string;
}

interface AvailabilityOption {
  key: AvailabilityFilter;
  label: string;
  description: string;
}

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, TitleCasePipe, HeroSliderComponent],
  template: `
    <div class="store">
      <!-- Hero Section -->
      <app-hero-slider
        [slides]="heroSlidesData()"
        [autoSlideInterval]="5000"
        (categoryClick)="filterByCategory($event.slug, $event.event)"
        (viewAll)="viewAll($event)"
      ></app-hero-slider>

      <section class="category-banners">
        <div class="category-banner" *ngFor="let banner of categoryBanners" (click)="filterByCategory(banner.slug)">
          <img [src]="banner.image" [alt]="banner.title" />
          <div class="banner-content">
            <p class="banner-eyebrow">{{ banner.eyebrow }}</p>
            <h3>{{ banner.title }}</h3>
            <p>{{ banner.description }}</p>
            <button class="banner-link" (click)="filterByCategory(banner.slug, $event)">
              Shop {{ banner.category }}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Filters and Sort Bar -->

      <div class="active-filters-panel" *ngIf="hasActiveAdvancedFilters()">
        <span class="active-filters-label">Active filters:</span>
        <span class="filter-pill" *ngIf="getSelectedPriceLabel() as priceLabel">
          {{ priceLabel }}
        </span>
        <span class="filter-pill" *ngIf="getSelectedAvailabilityLabel() as availabilityLabel">
          {{ availabilityLabel }}
        </span>
        <button type="button" class="btn-link" (click)="resetAdvancedFilters()">Clear filters</button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading$ | async" class="loading-container">
        <div class="spinner"></div>
        <p>Loading products...</p>
      </div>

      <!-- Main Content Layout: Filters Left, Products Right -->
      <ng-container *ngIf="!(loading$ | async)">
        <div class="store-main-layout">
          <!-- Left Sidebar: Filters and Sort -->
          <aside class="store-sidebar">
            <div class="store-filter-panel">
              <!-- Sort Card -->
              <div class="filter-card">
                <div class="filter-card__header">
                  <div>
                    <p class="filter-eyebrow">Sort by</p>
                    <h4>Order products</h4>
                  </div>
                </div>
                <div class="sort-select-wrapper">
          <select class="sort-select" (change)="onSortChange($event)" [value]="currentSort">
            <option value="name">Sort by Name</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

              <!-- Price Range Filter -->
        <div class="filter-card">
          <div class="filter-card__header">
            <div>
              <p class="filter-eyebrow">Price range</p>
              <h4>Find the right budget</h4>
            </div>
            <button
              type="button"
              class="chip-reset"
              (click)="applyPriceRange('all')"
              *ngIf="selectedPriceFilter() !== 'all'"
            >
              Reset
            </button>
          </div>
          <div class="chip-row">
            <button
              type="button"
              class="chip"
              *ngFor="let range of priceRangeOptions"
              [class.active]="selectedPriceFilter() === range.key"
              (click)="applyPriceRange(range.key)"
            >
              {{ range.label }}
            </button>
          </div>
        </div>

              <!-- Availability Filter -->
        <div class="filter-card">
          <div class="filter-card__header">
            <div>
              <p class="filter-eyebrow">Availability</p>
              <h4>Inventory status</h4>
            </div>
            <button
              type="button"
              class="chip-reset"
              (click)="applyAvailabilityFilter('all')"
              *ngIf="selectedAvailabilityFilter() !== 'all'"
            >
              Reset
            </button>
          </div>
          <div class="chip-row">
            <button
              type="button"
              class="chip"
              *ngFor="let option of availabilityOptions"
              [class.active]="selectedAvailabilityFilter() === option.key"
              (click)="applyAvailabilityFilter(option.key)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
          </aside>

          <!-- Right Content: Products Grid -->
        <div *ngIf="(sortedProducts$ | async) as visibleProducts" class="products-container">
          <ng-container *ngIf="visibleProducts.length; else emptyState">
            <div class="products-grid">
              <article
                *ngFor="let product of visibleProducts"
                class="product-card"
              >
                <div class="product-card__image-wrapper" (click)="viewProduct(product.id)">
                <div class="product-card__image">
                  <img
                    *ngIf="product.imageUrl"
                    [src]="product.imageUrl"
                    [alt]="product.name"
                    class="product-image"
                    (error)="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex'"
                  />
                  <div class="image-placeholder" [style.display]="product.imageUrl ? 'none' : 'flex'">
                    <span class="placeholder-icon">💍</span>
                    </div>
                    <div class="product-overlay">
                      <button
                        class="btn-quick-view"
                        (click)="viewProduct(product.id); $event.stopPropagation()"
                      >
                        Quick View
                      </button>
                    </div>
                  </div>
                  <div class="product-badges">
                    <span *ngIf="product.inventory === 1" class="badge badge-warning">
                      ONLY 1 LEFT!
                    </span>
                    <span *ngIf="product.inventory > 1 && product.inventory <= 5" class="badge badge-warning">
                      ONLY {{ product.inventory }} LEFT!
                    </span>
                    <span *ngIf="product.inventory === 0" class="badge badge-danger">Out of Stock</span>
                  </div>
                </div>
                <div class="product-card__content">
                  <div class="product-card__header">
                    <h3 class="product-card__title" (click)="viewProduct(product.id)">{{ product.name }}</h3>
                  <p class="product-card__sku">SKU: {{ product.sku }}</p>
                  </div>
                  <div class="product-card__footer">
                    <div class="product-card__price">
                      <span class="price-amount">{{ getFinalPrice(product) | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </ng-container>
        <ng-template #emptyState>
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try adjusting your search or filters</p>
            <button class="btn-primary" (click)="clearFilters()">Clear Filters</button>
          </div>
        </ng-template>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .store {
        width: 100%;
        min-height: 100vh;
      }

      /* Hero Section */
      .store-hero {
        position: relative;
        overflow: hidden;
        margin-bottom: 3rem;
        border-radius: 16px;
      }

      .hero-slider {
        position: relative;
        height: 480px;
      }

      .hero-slide {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 0.6s ease-in-out;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-slide.active {
        opacity: 1;
      }

      .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, rgba(15, 23, 42, 0.85) 20%, rgba(15, 23, 42, 0.15));
      }

      .hero-content {
        position: relative;
        z-index: 1;
        max-width: 640px;
        text-align: left;
        color: #fff;
        padding: 2rem;
      }

      .hero-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        color: rgba(255, 255, 255, 0.8);
      }

      .hero-title {
        font-size: 3rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
        letter-spacing: -0.5px;
      }

      .hero-subtitle {
        font-size: 1.125rem;
        margin: 0 0 2rem 0;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.6;
      }

      .hero-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .hero-actions .btn-secondary {
        padding: 0.875rem 2rem;
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: #fff;
        background: transparent;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .hero-actions .btn-secondary:hover {
        border-color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      .hero-indicators {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .indicator-dot {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        border: none;
        background: #d1d5db;
        opacity: 0.7;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .indicator-dot.active {
        width: 32px;
        background: #d4af37;
        opacity: 1;
      }

      .category-banners {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        margin-bottom: 3rem;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
        padding: 0 2rem;
        width: 100%;
      }

      .category-banner {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        min-height: 200px;
        display: flex;
        align-items: flex-end;
        background: #111827;
      }

      .category-banner img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s ease;
      }

      .category-banner::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0) 20%, rgba(15, 23, 42, 0.9) 100%);
      }

      .category-banner:hover img {
        transform: scale(1.08);
      }

      .banner-content {
        position: relative;
        z-index: 1;
        padding: 0.75rem;
        color: #fff;
      }

      .banner-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.75rem;
        margin-bottom: 0.5rem;
        color: rgba(255, 255, 255, 0.7);
      }

      .banner-content h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .banner-content p {
        margin: 0 0 1rem 0;
        color: rgba(255, 255, 255, 0.85);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .banner-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        border: none;
        background: transparent;
        color: #fff;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        padding: 0;
        position: relative;
      }

      .banner-link::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -4px;
        width: 100%;
        height: 2px;
        background: #fff;
        opacity: 0;
        transform: translateY(4px);
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .category-banner:hover .banner-link::after {
        opacity: 1;
        transform: translateY(0);
      }


      /* Controls */
      .store-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        background: #FFFFFF;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .controls-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .product-count {
        color: #666666;
        font-weight: 500;
        font-size: 0.95rem;
      }

      .active-filter {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: #fff7ed;
        color: #b45309;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.85rem;
        border: 1px solid #fed7aa;
      }

      .clear-filter {
        border: none;
        background: transparent;
        color: #b45309;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.85rem;
      }

      .sort-select-wrapper {
        width: 100%;
      }

      .sort-select {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        background: #FFFFFF;
        color: #1a1a1a;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s;
        font-weight: 500;
      }

      .sort-select:hover {
        border-color: #D4AF37;
      }

      .sort-select:focus {
        outline: none;
        border-color: #D4AF37;
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
      }

      .store-main-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 2rem;
        align-items: start;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
        padding: 0 2rem;
      }

      .store-sidebar {
        position: sticky;
        top: 1rem;
        height: fit-content;
      }

      .store-filter-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .filter-card {
        background: #FFFFFF;
        border: 1px solid #e5e5e5;
        border-radius: 0.75rem;
        padding: 1.25rem 1.5rem;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.04);
      }

      .filter-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .filter-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.15em;
        font-size: 0.65rem;
        color: #b76e79;
        margin: 0 0 0.15rem 0;
      }

      .filter-card__header h4 {
        margin: 0;
        font-size: 1.1rem;
        color: #1a1a1a;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .chip {
        padding: 0.4rem 1rem;
        border-radius: 999px;
        border: 1px solid #e5e5e5;
        background: #fff;
        color: #1a1a1a;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 600;
        font-size: 0.85rem;
      }

      .chip:hover {
        border-color: #D4AF37;
        color: #D4AF37;
      }

      .chip.active {
        background: linear-gradient(120deg, #d4af37, #b76e79);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 8px 20px rgba(183, 110, 121, 0.25);
      }

      .chip-reset {
        border: none;
        background: transparent;
        color: #b76e79;
        cursor: pointer;
        font-weight: 600;
      }

      .active-filters-panel {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border: 1px solid #fde4d1;
        background: #fff9f4;
        border-radius: 999px;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
        padding-left: 2rem;
        padding-right: 2rem;
      }

      .active-filters-label {
        font-weight: 600;
        color: #b76e79;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.75rem;
      }

      .filter-pill {
        padding: 0.35rem 0.9rem;
        border-radius: 999px;
        background: #fff;
        border: 1px solid #f0c9a9;
        color: #b76e79;
        font-weight: 600;
        font-size: 0.85rem;
      }

      .btn-link {
        border: none;
        background: transparent;
        color: #b76e79;
        text-decoration: underline;
        cursor: pointer;
        font-weight: 600;
      }


      /* Products Container */
      .products-container {
        padding: 0;
        width: 100%;
      }

      .products-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.5rem;
        padding: 0;
      }

      /* Product Card */
      .product-card {
        background: #FFFFFF;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        border: 1px solid #f0f0f0;
        position: relative;
        height: 100%;
      }

      .product-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
        border-color: #D4AF37;
      }

      .product-card__image-wrapper {
        position: relative;
        width: 100%;
        overflow: hidden;
        cursor: pointer;
      }

      .product-card__image {
        position: relative;
        width: 100%;
        height: 360px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .product-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .product-card:hover .product-image {
        transform: scale(1.1);
      }

      .product-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.4) 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }

      .product-card:hover .product-overlay {
        opacity: 1;
        pointer-events: all;
      }

      .btn-quick-view {
        padding: 0.75rem 1.5rem;
        background: rgba(255, 255, 255, 0.95);
        color: #1a1a1a;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .btn-quick-view:hover {
        background: #fff;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .placeholder-icon {
        font-size: 4rem;
        opacity: 0.2;
        transition: all 0.3s;
        color: #D4AF37;
      }

      .product-card:hover .placeholder-icon {
        transform: scale(1.15);
        opacity: 0.35;
      }

      .product-badges {
        position: absolute;
        top: 12px;
        right: 12px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 2;
      }

      .badge {
        padding: 0.5rem 0.875rem;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(8px);
        border: none;
        white-space: nowrap;
      }

      .badge-warning {
        background: #FFD700;
        color: #000000;
        box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }

      .badge-danger {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.5);
      }

      .product-card__content {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 0.5rem;
      }

      .product-card__header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .product-card__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1a1a1a;
        line-height: 1.4;
        cursor: pointer;
        transition: color 0.2s ease;
        letter-spacing: -0.01em;
      }

      .product-card__title:hover {
        color: #D4AF37;
      }

      .product-card__sku {
        margin: 0;
        color: #666666;
        font-size: 0.8125rem;
        font-family: 'Monaco', 'Menlo', monospace;
        font-weight: 400;
        letter-spacing: 0.02em;
      }

      .product-card__footer {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 1rem;
        margin-top: auto;
        padding-top: 1.25rem;
        border-top: 1px solid #f0f0f0;
      }

      .product-card__price {
        display: flex;
        flex-direction: column;
      }

      .price-amount {
        font-size: 1.75rem;
        font-weight: 400;
        color: #1a1a1a;
        line-height: 1;
        letter-spacing: -0.03em;
      }

      .btn-add-to-cart {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 1.5rem;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        color: #FFFFFF;
        font-weight: 700;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        position: relative;
        overflow: hidden;
      }

      .btn-add-to-cart::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(212, 175, 55, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
      }

      .btn-add-to-cart:hover:not(:disabled)::before {
        width: 300px;
        height: 300px;
      }

      .btn-add-to-cart:hover:not(:disabled) {
        transform: translateY(-2px);
        background: linear-gradient(135deg, #D4AF37 0%, #C9A227 100%);
        box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);
      }

      .btn-add-to-cart:active:not(:disabled) {
        transform: translateY(0);
      }

      .btn-add-to-cart:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
        background: #e5e5e5;
        color: #999;
      }

      .btn-icon {
        font-size: 1.125rem;
        position: relative;
        z-index: 1;
      }

      .btn-text {
        position: relative;
        z-index: 1;
      }



      /* Responsive Design */
      @media (max-width: 1024px) {
        .store-main-layout {
          grid-template-columns: 1fr;
        }

        .store-sidebar {
          position: static;
        }

        .store-filter-panel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
      }

      @media (max-width: 1200px) {
        .products-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
      }

      @media (max-width: 768px) {
        .store-controls,
        .store-main-layout,
        .active-filters-panel,
        .category-banners {
          padding-left: 1rem;
          padding-right: 1rem;
        }

        .store-hero {
          padding: 3rem 1.5rem;
        }

        .hero-title {
          font-size: 2rem;
        }

        .hero-subtitle {
          font-size: 1rem;
        }

        .store-controls {
          flex-direction: column;
          align-items: stretch;
        }

        .store-main-layout {
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        .store-sidebar {
          position: static;
        }

        .store-filter-panel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .products-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .product-card__image {
          height: 280px;
        }

        .product-card__content {
          padding: 1.25rem;
        }

        .price-amount {
          font-size: 1.5rem;
        }

        .btn-add-to-cart {
          padding: 0.75rem 1.25rem;
          font-size: 0.8rem;
        }
      }

      @media (max-width: 480px) {
        .store-hero {
          padding: 2rem 1rem;
        }

        .hero-title {
          font-size: 1.75rem;
        }

        .products-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .product-card__image {
          height: 300px;
        }

        .product-card__content {
          padding: 1.25rem;
        }

        .btn-add-to-cart {
          padding: 0.75rem 1.25rem;
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class StoreComponent implements OnInit, OnDestroy {
  products$: Observable<Product[]>;
  loading$: Observable<boolean>;
  cartItemCount$: Observable<number>;
  sortedProducts$: Observable<Product[]>;
  readonly categories = signal<Category[]>([]);
  heroSlidesData = signal<HeroSlide[]>([]);
  
  readonly heroSlides = [
    {
      slug: 'rings',
      category: 'Rings',
      title: 'Exquisite Jewelry Collections',
      subtitle: 'Discover timeless elegance and premium craftsmanship',
      eyebrow: 'New Arrivals',
      image: 'https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?w=1400&h=800&fit=crop',
    },
    {
      slug: 'necklaces',
      category: 'Necklaces',
      title: 'Layers of Luxury',
      subtitle: 'Necklaces and pendants inspired by the modern muse',
      eyebrow: 'Bestsellers',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1400&h=800&fit=crop',
    },
    {
      slug: 'bracelets',
      category: 'Bracelets',
      title: 'Brilliance in Every Move',
      subtitle: 'Statement bracelets crafted to glow with you',
      eyebrow: 'Editor’s Pick',
      image: 'https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=1400&h=800&fit=crop',
    },
  ];
  readonly categoryBanners = [
    {
      slug: 'earrings',
      category: 'Earrings',
      title: 'Everyday Elegance',
      description: 'Hoops, studs, and chandbalis that shine from desk to dinner.',
      eyebrow: 'Curated',
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=600&fit=crop',
    },
    {
      slug: 'bangles',
      category: 'Bangles',
      title: 'Heritage Glow',
      description: 'Handcrafted bangles celebrating Indian artistry and tradition.',
      eyebrow: 'Limited',
      image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=600&fit=crop',
    },
    {
      slug: 'pendants',
      category: 'Pendants',
      title: 'Personal Stories',
      description: 'Keep memories close with pendants made to layer and love.',
      eyebrow: 'Personalized',
      image: 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=800&h=600&fit=crop',
    },
  ];
  readonly priceRangeOptions: PriceRangeOption[] = [
    { key: 'all', label: 'All price points' },
    { key: 'under-20000', label: 'Under ₹20,000', range: { min: 0, max: 20000 } },
    { key: '20000-60000', label: '₹20,000 - ₹60,000', range: { min: 20000, max: 60000 } },
    { key: '60000-120000', label: '₹60,000 - ₹1,20,000', range: { min: 60000, max: 120000 } },
    { key: 'over-120000', label: '₹1,20,000+', range: { min: 120000, max: Number.MAX_SAFE_INTEGER } },
  ];
  readonly availabilityOptions: AvailabilityOption[] = [
    { key: 'all', label: 'All inventory', description: 'Show every product' },
    { key: 'in_stock', label: 'In Stock', description: 'More than 5 units available' },
    { key: 'low_stock', label: 'Low Stock', description: '5 units or fewer' },
    { key: 'out_of_stock', label: 'Out of Stock', description: 'Currently unavailable' },
  ];
  activeCategorySlug: string | null = null;
  currentSort = 'name';
  private readonly sortBy$ = new BehaviorSubject<string>('name');
  private readonly activeCategoryId$ = new BehaviorSubject<string | null>(null);
  private readonly priceFilter$ = new BehaviorSubject<{ min: number; max: number } | null>(null);
  private readonly availabilityFilter$ = new BehaviorSubject<AvailabilityFilter>('all');
  selectedPriceFilter = signal<string>('all');
  selectedAvailabilityFilter = signal<AvailabilityFilter>('all');
  private pendingCategorySlug: string | null = null;

  constructor(
    private readonly store: Store<AppState>,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly categoryService: CategoryService
  ) {
    this.products$ = this.store.select(selectCatalogItems);
    this.loading$ = this.store.select(selectCatalogLoading);
    this.cartItemCount$ = this.store.select(selectCartItemCount);

    this.sortedProducts$ = combineLatest([
      this.products$,
      this.sortBy$,
      this.activeCategoryId$,
      this.priceFilter$,
      this.availabilityFilter$,
    ]).pipe(
      map(([products, sortBy, categoryId, priceRange, availability]) => {
        let filtered = products;
        if (categoryId) {
          filtered = filtered.filter((product) => product.categoryId === categoryId);
        }

        if (priceRange) {
          filtered = filtered.filter((product) => {
            // Use calculated final price instead of base price
            const breakdown = calculateProductPrice(product, 1);
            const finalPrice = breakdown.finalPrice;
            return finalPrice >= priceRange.min && finalPrice <= priceRange.max;
          });
        }

        if (availability !== 'all') {
          filtered = filtered.filter((product) => {
            if (availability === 'in_stock') {
              return product.inventory > 5;
            }
            if (availability === 'low_stock') {
              return product.inventory > 0 && product.inventory <= 5;
            }
            if (availability === 'out_of_stock') {
              return product.inventory === 0;
            }
            return true;
          });
        }

        const sorted = [...filtered];
        switch (sortBy) {
          case 'price-low':
            return sorted.sort((a, b) => Number(a.price.amount) - Number(b.price.amount));
          case 'price-high':
            return sorted.sort((a, b) => Number(b.price.amount) - Number(a.price.amount));
          case 'newest':
            return sorted;
          case 'name':
          default:
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        }
      })
    );
  }

  ngOnInit(): void {
    // Initialize hero slides data
    this.heroSlidesData.set(this.heroSlides.map(slide => ({
      image: slide.image,
      eyebrow: slide.eyebrow,
      title: slide.title,
      subtitle: slide.subtitle,
      category: slide.category,
      slug: slide.slug
    })));
    
    this.loadCategories();

    this.route.queryParams
      .pipe(map((params) => params['search']))
      .subscribe((search) => {
        this.store.dispatch(CatalogActions.loadProducts({ search: search || undefined }));
      });

    this.route.queryParams
      .pipe(map((params) => params['category'] ?? null))
      .subscribe((slug) => this.applyCategorySlug(slug));
  }

  ngOnDestroy(): void {
    // Cleanup handled by HeroSliderComponent
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.currentSort = target.value;
    this.sortBy$.next(this.currentSort);
  }


  filterByCategory(slug: string, event?: Event): void {
    event?.stopPropagation();
    this.applyCategorySlug(slug, true);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: slug },
      queryParamsHandling: 'merge',
    });
    this.scrollToCollection();
  }

  viewAll(event?: Event): void {
    event?.preventDefault();
    this.clearCategoryFilter();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: null },
      queryParamsHandling: 'merge',
    });
    this.scrollToCollection();
  }

  clearCategoryFilter(event?: Event): void {
    event?.stopPropagation();
    this.activeCategorySlug = null;
    this.activeCategoryId$.next(null);
  }

  scrollToCollection(event?: Event): void {
    event?.preventDefault();
    const container = document.querySelector('.products-container');
    container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  applyPriceRange(key: string): void {
    const nextKey = this.selectedPriceFilter() === key ? 'all' : key;
    this.selectedPriceFilter.set(nextKey);
    const selectedOption = this.priceRangeOptions.find((option) => option.key === nextKey);
    this.priceFilter$.next(selectedOption?.range ?? null);
    this.scrollToCollection();
  }

  applyAvailabilityFilter(filter: AvailabilityFilter): void {
    const nextFilter = this.selectedAvailabilityFilter() === filter ? 'all' : filter;
    this.selectedAvailabilityFilter.set(nextFilter);
    this.availabilityFilter$.next(nextFilter);
    this.scrollToCollection();
  }

  hasActiveAdvancedFilters(): boolean {
    return this.selectedPriceFilter() !== 'all' || this.selectedAvailabilityFilter() !== 'all';
  }

  getSelectedPriceLabel(): string | null {
    if (this.selectedPriceFilter() === 'all') {
      return null;
    }
    return this.priceRangeOptions.find((option) => option.key === this.selectedPriceFilter())?.label ?? null;
  }

  getSelectedAvailabilityLabel(): string | null {
    if (this.selectedAvailabilityFilter() === 'all') {
      return null;
    }
    return (
      this.availabilityOptions.find((option) => option.key === this.selectedAvailabilityFilter())?.label ?? null
    );
  }

  resetAdvancedFilters(): void {
    this.selectedPriceFilter.set('all');
    this.selectedAvailabilityFilter.set('all');
    this.priceFilter$.next(null);
    this.availabilityFilter$.next('all');
  }

  getFinalPrice(product: Product): number {
    const breakdown = calculateProductPrice(product, 1);
    return breakdown.finalPrice;
  }

  addToCart(product: Product, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (product.inventory > 0) {
      // Calculate final price using all pricing fields (per-unit values)
      const breakdownPerUnit = calculateProductPrice(product, 1);
      const finalPrice = {
        currency: breakdownPerUnit.currency,
        amount: breakdownPerUnit.finalPrice,
      };
      
      this.store.dispatch(
        CartActions.addItem({
          productId: product.id,
          name: product.name,
          price: finalPrice,
          quantity: 1,
          imageUrl: product.imageUrl,
          sku: product.sku,
          inventory: product.inventory, // Store inventory
          priceBreakdown: {
            // Store per-unit values
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
    }
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/store/product', productId]);
  }

  clearFilters(): void {
    this.resetAdvancedFilters();
    this.viewAll();
    this.router.navigate(['/store'], { queryParams: {} });
    this.store.dispatch(CatalogActions.loadProducts({ search: undefined }));
  }


  private loadCategories(): void {
    this.categoryService
      .listCategories(true)
      .pipe(
        map((response) => response.items),
        catchError(() => {
          this.categories.set([]);
          return of([]);
        })
      )
      .subscribe((items) => {
        this.categories.set(items);
        if (this.pendingCategorySlug) {
          this.applyCategorySlug(this.pendingCategorySlug, true);
          this.pendingCategorySlug = null;
        }
      });
  }

  private applyCategorySlug(slug: string | null, prioritize?: boolean): void {
    if (!slug) {
      this.activeCategorySlug = null;
      this.activeCategoryId$.next(null);
      return;
    }

    const categories = this.categories();
    if (!categories.length && !prioritize) {
      this.pendingCategorySlug = slug;
      return;
    }

    const category = categories.find((cat) => cat.slug === slug);
    if (category) {
      this.activeCategorySlug = slug;
      this.activeCategoryId$.next(category.id);
    } else {
      this.pendingCategorySlug = slug;
    }
  }
}
