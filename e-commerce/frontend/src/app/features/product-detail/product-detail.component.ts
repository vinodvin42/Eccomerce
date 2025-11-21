import { AsyncPipe, CurrencyPipe, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  imports: [NgIf, AsyncPipe, CurrencyPipe, RouterLink, FormsModule],
  template: `
    <div class="product-page">
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
                <div class="product-image-frame">
                  <img
                    *ngIf="product.imageUrl && !imageError"
                    [src]="product.imageUrl"
                    [alt]="product.name"
                    (error)="onImageError()"
                  />
                  <div class="image-placeholder" *ngIf="!product.imageUrl || imageError">
                    <span class="image-icon">{{ product.name.charAt(0) }}</span>
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
      .product-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem 3rem;
        background: var(--premium-pearl);
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
      .product-card {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
      }
      .product-image-section {
        margin-bottom: 1.5rem;
      }
      .product-image-frame {
        width: 100%;
        height: 500px;
        border: 1px solid #e3e6e6;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fafafa;
        overflow: hidden;
      }
      .product-image-frame img {
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
        color: #aeb1b5;
      }
      .image-icon {
        font-size: 4rem;
        font-weight: 600;
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
      .action-card {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
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
      .btn-primary {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        padding: 0.85rem 2.5rem;
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        text-decoration: none;
        border-radius: 999px;
        font-weight: 600;
        border: none;
        transition: all 0.2s ease;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
        width: 100%;
        font-size: 1rem;
        margin-bottom: 0.75rem;
      }
      .btn-primary:hover:not(:disabled) {
        opacity: 0.9;
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-secondary {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        padding: 0.85rem 2.5rem;
        background: transparent;
        color: var(--premium-rose-gold);
        text-decoration: none;
        border-radius: 999px;
        font-weight: 600;
        border: 1px solid var(--premium-silver);
        transition: all 0.2s ease;
        cursor: pointer;
        width: 100%;
        font-size: 1rem;
        margin-bottom: 1.5rem;
      }
      .btn-secondary:hover:not(:disabled) {
        background: var(--premium-moonstone);
      }
      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
      @media (max-width: 960px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
        .action-panel {
          position: static;
        }
        .product-image-frame {
          height: 400px;
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

