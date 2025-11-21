import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CatalogActions } from '../../state/catalog/catalog.actions';
import { selectCatalogItems, selectCatalogLoading } from '../../state/catalog/catalog.selectors';
import type { AppState } from '../../state';
import type { Product } from '../../shared/models/catalog';
import { calculateProductPrice } from '../../core/utils/price-calculator';
import { selectCartItemCount } from '../../state/cart/cart.selectors';
import { CategoryService } from '../../core/services/category.service';
import type { Category } from '../../shared/models/category';
import { CartActions } from '../../state/cart/cart.actions';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, CurrencyPipe, RouterLink, FormsModule],
  template: `
    <div class="landing-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-background">
          <div class="hero-overlay"></div>
        </div>
        <div class="hero-content">
          <div class="hero-text">
            <p class="hero-eyebrow">Premium Collection</p>
            <h1 class="hero-title">Timeless Elegance,<br />Crafted to Perfection</h1>
            <p class="hero-description">Discover our exquisite collection of handcrafted jewelry, where tradition meets modern sophistication.</p>
            <div class="hero-cta">
              <button class="btn-primary-large" routerLink="/store">Shop Now</button>
              <button class="btn-secondary-large" routerLink="/store">Explore Collections</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Categories -->
      <section class="categories-section">
        <div class="section-container">
          <div class="section-header">
            <h2 class="section-title">Shop by Category</h2>
            <p class="section-subtitle">Explore our curated collections</p>
          </div>
          <div class="categories-grid">
            <div class="category-card" *ngFor="let category of featuredCategories" (click)="navigateToCategory(category.slug)">
              <div class="category-image">
                <img [src]="category.image" [alt]="category.name" />
                <div class="category-overlay"></div>
              </div>
              <div class="category-content">
                <h3>{{ category.name }}</h3>
                <p>{{ category.description }}</p>
                <span class="category-link">Shop {{ category.name }} →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Products -->
      <section class="products-section">
        <div class="section-container">
          <div class="section-header">
            <h2 class="section-title">Featured Products</h2>
            <p class="section-subtitle">Handpicked for you</p>
          </div>
          <div *ngIf="loading$ | async" class="loading-state">
            <div class="spinner"></div>
            <p>Loading products...</p>
          </div>
          <div *ngIf="!(loading$ | async) && (featuredProducts$ | async) as products" class="products-grid">
            <article class="product-card" *ngFor="let product of products.slice(0, 8)">
              <div class="product-image-wrapper" (click)="viewProduct(product.id)">
                <div class="product-image">
                  <img
                    *ngIf="product.imageUrl"
                    [src]="product.imageUrl"
                    [alt]="product.name"
                    (error)="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex'"
                  />
                  <div class="image-placeholder" [style.display]="product.imageUrl ? 'none' : 'flex'">
                    <span class="placeholder-icon">💍</span>
                  </div>
                  <div class="product-overlay">
                    <button class="btn-quick-view" (click)="viewProduct(product.id); $event.stopPropagation()">
                      Quick View
                    </button>
                  </div>
                </div>
                <div class="product-badges">
                  <span *ngIf="isNewProduct(product)" class="badge badge-new">New</span>
                  <span *ngIf="product.inventory === 0" class="badge badge-out">Out of Stock</span>
                </div>
              </div>
              <div class="product-info">
                <h3 class="product-name" (click)="viewProduct(product.id)">{{ product.name }}</h3>
                <div class="product-rating">
                  <span class="stars">★★★★★</span>
                  <span class="rating-text">(4.8)</span>
                </div>
                <div class="product-footer">
                  <span class="product-price">{{ getFinalPrice(product) | currency : (product.price.currency || 'INR') : 'symbol' : '1.2-2' }}</span>
                  <button 
                    class="btn-add-cart" 
                    (click)="addToCart(product, $event)"
                    [disabled]="product.inventory === 0"
                    *ngIf="product.inventory > 0"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Benefits Section -->
      <section class="benefits-section">
        <div class="section-container">
          <div class="benefits-grid">
            <div class="benefit-item" *ngFor="let benefit of benefits">
              <div class="benefit-icon">{{ benefit.icon }}</div>
              <h3>{{ benefit.title }}</h3>
              <p>{{ benefit.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="testimonials-section">
        <div class="section-container">
          <div class="section-header">
            <h2 class="section-title">What Our Customers Say</h2>
            <p class="section-subtitle">Trusted by thousands of satisfied customers</p>
          </div>
          <div class="testimonials-grid">
            <div class="testimonial-card" *ngFor="let testimonial of testimonials">
              <div class="testimonial-rating">
                <span class="stars">★★★★★</span>
              </div>
              <p class="testimonial-text">"{{ testimonial.text }}"</p>
              <div class="testimonial-author">
                <div class="author-avatar">{{ testimonial.avatar }}</div>
                <div class="author-info">
                  <h4>{{ testimonial.name }}</h4>
                  <p>{{ testimonial.role }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Newsletter Section -->
      <section class="newsletter-section">
        <div class="section-container">
          <div class="newsletter-content">
            <h2>Stay in the Loop</h2>
            <p>Subscribe to our newsletter and get exclusive offers, new arrivals, and style tips delivered to your inbox.</p>
            <form class="newsletter-form" (ngSubmit)="subscribeNewsletter()">
              <input
                type="email"
                placeholder="Enter your email address"
                class="newsletter-input"
                [(ngModel)]="newsletterEmail"
                required
                #emailInput="ngModel"
              />
              <button type="submit" class="btn-newsletter">Subscribe</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .landing-page {
        width: 100%;
        min-height: 100vh;
        background: #ffffff;
      }

      /* Hero Section */
      .hero-section {
        position: relative;
        min-height: 90vh;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      }

      .hero-background {
        position: absolute;
        inset: 0;
        background-image: url('https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920&h=1080&fit=crop');
        background-size: cover;
        background-position: center;
        opacity: 0.3;
      }

      .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.7) 100%);
      }

      .hero-content {
        position: relative;
        z-index: 1;
        max-width: 1200px;
        margin: 0 auto;
        padding: 4rem 2rem;
        text-align: center;
        color: #ffffff;
      }

      .hero-eyebrow {
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #d4af37;
        margin-bottom: 1rem;
      }

      .hero-title {
        font-size: 4.5rem;
        font-weight: 900;
        line-height: 1.1;
        margin: 0 0 1.5rem 0;
        letter-spacing: -0.02em;
      }

      .hero-description {
        font-size: 1.25rem;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.9);
        max-width: 600px;
        margin: 0 auto 2.5rem;
      }

      .hero-cta {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .btn-primary-large {
        padding: 1.125rem 2.5rem;
        background: #d4af37;
        color: #ffffff;
        border: none;
        border-radius: 50px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
      }

      .btn-primary-large:hover {
        background: #c9a227;
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(212, 175, 55, 0.5);
      }

      .btn-secondary-large {
        padding: 1.125rem 2.5rem;
        background: transparent;
        color: #ffffff;
        border: 2px solid #ffffff;
        border-radius: 50px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .btn-secondary-large:hover {
        background: #ffffff;
        color: #1a1a1a;
      }

      /* Section Styles */
      .section-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 5rem 2rem;
      }

      .section-header {
        text-align: center;
        margin-bottom: 3rem;
      }

      .section-title {
        font-size: 2.5rem;
        font-weight: 800;
        color: #1a1a1a;
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.02em;
      }

      .section-subtitle {
        font-size: 1.125rem;
        color: #666666;
        margin: 0;
      }

      /* Categories Section */
      .categories-section {
        background: #f8f9fa;
      }

      .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
      }

      .category-card {
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .category-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
      }

      .category-image {
        position: relative;
        height: 300px;
        overflow: hidden;
      }

      .category-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s ease;
      }

      .category-card:hover .category-image img {
        transform: scale(1.1);
      }

      .category-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.6) 100%);
      }

      .category-content {
        padding: 2rem;
        text-align: center;
      }

      .category-content h3 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0 0 0.5rem 0;
      }

      .category-content p {
        color: #666666;
        margin: 0 0 1rem 0;
        font-size: 0.95rem;
      }

      .category-link {
        color: #d4af37;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.3s ease;
      }

      .category-card:hover .category-link {
        color: #c9a227;
        transform: translateX(4px);
      }

      /* Products Section */
      .products-section {
        background: #ffffff;
      }

      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
      }

      .product-card {
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #f0f0f0;
      }

      .product-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .product-image-wrapper {
        position: relative;
        width: 100%;
        overflow: hidden;
      }

      .product-image {
        position: relative;
        width: 100%;
        height: 320px;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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
        opacity: 0.3;
        color: #d4af37;
      }

      .product-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .product-card:hover .product-overlay {
        opacity: 1;
      }

      .btn-quick-view {
        padding: 0.875rem 1.75rem;
        background: #ffffff;
        color: #1a1a1a;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .btn-quick-view:hover {
        background: #d4af37;
        color: #ffffff;
      }

      .product-badges {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 2;
      }

      .badge {
        padding: 0.375rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .badge-new {
        background: #10b981;
        color: #ffffff;
      }

      .badge-out {
        background: #ef4444;
        color: #ffffff;
      }

      .product-info {
        padding: 1.5rem;
      }

      .product-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1a1a1a;
        margin: 0 0 0.75rem 0;
        cursor: pointer;
        transition: color 0.2s ease;
      }

      .product-name:hover {
        color: #d4af37;
      }

      .product-rating {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .stars {
        color: #fbbf24;
        font-size: 0.875rem;
      }

      .rating-text {
        font-size: 0.875rem;
        color: #666666;
      }

      .product-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .product-price {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1a1a1a;
      }

      .btn-add-cart {
        padding: 0.625rem 1.25rem;
        background: #1a1a1a;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .btn-add-cart:hover {
        background: #d4af37;
      }

      .btn-add-cart:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Benefits Section */
      .benefits-section {
        background: #f8f9fa;
      }

      .benefits-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 3rem;
      }

      .benefit-item {
        text-align: center;
      }

      .benefit-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .benefit-item h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0 0 0.5rem 0;
      }

      .benefit-item p {
        color: #666666;
        margin: 0;
        line-height: 1.6;
      }

      /* Testimonials Section */
      .testimonials-section {
        background: #ffffff;
      }

      .testimonials-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 2rem;
      }

      .testimonial-card {
        background: #f8f9fa;
        border-radius: 16px;
        padding: 2rem;
        transition: all 0.3s ease;
      }

      .testimonial-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      }

      .testimonial-rating {
        margin-bottom: 1rem;
      }

      .testimonial-text {
        font-size: 1.125rem;
        line-height: 1.7;
        color: #1a1a1a;
        margin: 0 0 1.5rem 0;
        font-style: italic;
      }

      .testimonial-author {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .author-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #d4af37;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 700;
        color: #ffffff;
      }

      .author-info h4 {
        margin: 0 0 0.25rem 0;
        font-size: 1rem;
        font-weight: 700;
        color: #1a1a1a;
      }

      .author-info p {
        margin: 0;
        font-size: 0.875rem;
        color: #666666;
      }

      /* Newsletter Section */
      .newsletter-section {
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        color: #ffffff;
      }

      .newsletter-content {
        text-align: center;
        max-width: 600px;
        margin: 0 auto;
      }

      .newsletter-content h2 {
        font-size: 2.5rem;
        font-weight: 800;
        margin: 0 0 1rem 0;
      }

      .newsletter-content p {
        font-size: 1.125rem;
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 2rem 0;
        line-height: 1.6;
      }

      .newsletter-form {
        display: flex;
        gap: 1rem;
        max-width: 500px;
        margin: 0 auto;
      }

      .newsletter-input {
        flex: 1;
        padding: 1rem 1.5rem;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 50px;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        font-size: 1rem;
        outline: none;
        transition: all 0.3s ease;
      }

      .newsletter-input::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }

      .newsletter-input:focus {
        border-color: #d4af37;
        background: rgba(255, 255, 255, 0.15);
      }

      .btn-newsletter {
        padding: 1rem 2rem;
        background: #d4af37;
        color: #ffffff;
        border: none;
        border-radius: 50px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        white-space: nowrap;
      }

      .btn-newsletter:hover {
        background: #c9a227;
        transform: translateY(-2px);
      }

      /* Loading State */
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        gap: 1rem;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #e5e5e5;
        border-top-color: #d4af37;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Responsive Design */
      @media (max-width: 1024px) {
        .hero-title {
          font-size: 3.5rem;
        }

        .section-title {
          font-size: 2rem;
        }

        .categories-grid,
        .products-grid {
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }
      }

      @media (max-width: 768px) {
        .hero-title {
          font-size: 2.5rem;
        }

        .hero-description {
          font-size: 1rem;
        }

        .hero-cta {
          flex-direction: column;
        }

        .btn-primary-large,
        .btn-secondary-large {
          width: 100%;
        }

        .section-container {
          padding: 3rem 1.5rem;
        }

        .newsletter-form {
          flex-direction: column;
        }

        .btn-newsletter {
          width: 100%;
        }
      }
    `,
  ],
})
export class LandingComponent implements OnInit {
  products$: Observable<Product[]>;
  loading$: Observable<boolean>;
  cartItemCount$: Observable<number>;
  featuredProducts$: Observable<Product[]>;
  readonly categories = signal<Category[]>([]);
  newsletterEmail = '';

  readonly featuredCategories = [
    {
      name: 'Necklaces',
      slug: 'necklaces',
      description: 'Elegant pieces for every occasion',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=400&fit=crop',
    },
    {
      name: 'Rings',
      slug: 'rings',
      description: 'Symbols of love and commitment',
      image: 'https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?w=600&h=400&fit=crop',
    },
    {
      name: 'Earrings',
      slug: 'earrings',
      description: 'Sparkling accents for your style',
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&h=400&fit=crop',
    },
    {
      name: 'Bracelets',
      slug: 'bracelets',
      description: 'Timeless elegance for your wrist',
      image: 'https://images.unsplash.com/photo-1602777927000-01848f8ab216?w=600&h=400&fit=crop',
    },
  ];

  readonly benefits = [
    {
      icon: '✨',
      title: 'Premium Quality',
      description: 'Handcrafted with the finest materials and attention to detail',
    },
    {
      icon: '🚚',
      title: 'Free Shipping',
      description: 'Complimentary shipping on orders over ₹10,000',
    },
    {
      icon: '🔒',
      title: 'Secure Payment',
      description: 'Your transactions are safe and encrypted',
    },
    {
      icon: '↩️',
      title: 'Easy Returns',
      description: '30-day hassle-free return policy',
    },
  ];

  readonly testimonials = [
    {
      text: 'The quality exceeded my expectations. Absolutely beautiful craftsmanship!',
      name: 'Priya Sharma',
      role: 'Verified Customer',
      avatar: 'PS',
    },
    {
      text: 'Fast shipping and excellent customer service. Will definitely order again!',
      name: 'Raj Patel',
      role: 'Verified Customer',
      avatar: 'RP',
    },
    {
      text: 'Stunning jewelry that gets compliments everywhere I go. Highly recommended!',
      name: 'Anita Desai',
      role: 'Verified Customer',
      avatar: 'AD',
    },
  ];

  constructor(
    private readonly store: Store<AppState>,
    private readonly router: Router,
    private readonly categoryService: CategoryService
  ) {
    this.products$ = this.store.select(selectCatalogItems);
    this.loading$ = this.store.select(selectCatalogLoading);
    this.cartItemCount$ = this.store.select(selectCartItemCount);

    this.featuredProducts$ = this.products$.pipe(
      map((products) => {
        // Show featured products (first 8 products)
        return products.slice(0, 8);
      })
    );
  }

  ngOnInit(): void {
    this.loadCategories();
    this.store.dispatch(CatalogActions.loadProducts({}));
  }

  private loadCategories(): void {
    this.categoryService
      .listCategories(true)
      .pipe(
        map((response) => response.items),
        catchError(() => {
          console.error('Failed to load categories');
          return of([]);
        })
      )
      .subscribe((categories) => {
        this.categories.set(categories);
      });
  }

  navigateToCategory(slug: string): void {
    this.router.navigate(['/store'], { queryParams: { category: slug } });
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/store/product', productId]);
  }

  addToCart(product: Product, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (product.inventory > 0) {
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
          inventory: product.inventory,
          priceBreakdown: {
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

  subscribeNewsletter(): void {
    if (this.newsletterEmail && this.newsletterEmail.includes('@')) {
      // TODO: Implement newsletter subscription
      console.log('Newsletter subscription:', this.newsletterEmail);
      alert('Thank you for subscribing to our newsletter!');
      this.newsletterEmail = '';
    }
  }

  isNewProduct(product: Product): boolean {
    const createdDate = new Date(product.audit.createdDate);
    const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation <= 30;
  }

  getFinalPrice(product: Product): number {
    const breakdown = calculateProductPrice(product, 1);
    return breakdown.finalPrice;
  }
}

