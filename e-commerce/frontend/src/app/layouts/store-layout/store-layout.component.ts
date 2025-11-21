import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';
import { selectCartItemCount, selectCartItems, selectCartTotal } from '../../state/cart/cart.selectors';
import type { AppState } from '../../state';
import { CartActions } from '../../state/cart/cart.actions';

@Component({
  selector: 'app-store-layout',
  standalone: true,
  imports: [AsyncPipe, NgIf, NgFor, CurrencyPipe, RouterLink, RouterLinkActive, RouterOutlet],
  styleUrls: ['./store-layout.component.css'],
  template: `
    <div class="store-layout">
      <!-- Top Navigation Bar -->
      <header class="store-header">
        <div class="store-header__container">
          <!-- Logo -->
          <a routerLink="/landing" class="store-logo">
            <img src="/assets/premium.png" alt="Premium Jewelry" class="logo-icon" />
            <span class="logo-text">{{ (tenantBrand$ | async) ?? 'Premium Jewelry' }}</span>
          </a>

          <!-- Right Actions: Search, Admin, Cart, User -->
          <div class="store-actions">
            <!-- Search Bar -->
            <div class="store-search">
              <button class="search-icon-btn" (click)="onSearch(searchInput.value)" title="Search">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
              <input
                type="search"
                placeholder="Search products..."
                class="search-input"
                #searchInput
                (keyup.enter)="onSearch(searchInput.value)"
              />
            </div>

            <!-- Cart Icon -->
            <div class="cart-menu">
              <button class="icon-btn cart-icon-btn" (click)="toggleCartDropdown()" title="Shopping Cart">
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M9 2v4M15 2v4"></path>
                  <path d="M3 10h18l-1 10H4L3 10z"></path>
                  <path d="M9 10V6a3 3 0 0 1 6 0v4"></path>
                </svg>
                <span class="cart-badge" *ngIf="(cartCount$ | async)! > 0">
                  {{ cartCount$ | async }}
                </span>
                <span class="cart-badge" *ngIf="(cartCount$ | async)! === 0">0</span>
              </button>
              <div class="cart-dropdown" *ngIf="showCartDropdown() && (cartItems$ | async) as items">
                <div class="cart-dropdown-header">
                  <h3>Shopping Cart</h3>
                  <button class="close-cart" (click)="closeCartDropdown()">×</button>
                </div>
                <div class="cart-dropdown-content" *ngIf="items.length > 0; else emptyCart">
                  <div class="cart-dropdown-items">
                    <div class="cart-dropdown-item" *ngFor="let item of items">
                      <img *ngIf="item.imageUrl" [src]="item.imageUrl" [alt]="item.name" class="cart-item-thumb" />
                      <div class="cart-item-info">
                        <p class="cart-item-name">{{ item.name }}</p>
                        <p class="cart-item-price">{{ item.price.amount | currency : (item.price.currency || 'INR') : 'symbol' : '1.2-2' }} × {{ item.quantity }}</p>
                      </div>
                      <button class="remove-item" (click)="removeItem(item.productId); $event.stopPropagation()" title="Remove">×</button>
                    </div>
                  </div>
                  <div class="cart-dropdown-footer">
                    <div class="cart-dropdown-total">
                      <span>Subtotal ({{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}):</span>
                      <strong>{{ cartTotal$ | async | currency : 'INR' : 'symbol' : '1.2-2' }}</strong>
                    </div>
                    <a routerLink="/checkout" class="btn-primary" (click)="closeCartDropdown()">
                      Proceed to Checkout
                    </a>
                    <p class="cart-dropdown-note">Secure checkout • 60-day returns • Lifetime support</p>
                  </div>
                </div>
                <ng-template #emptyCart>
                  <div class="empty-state">
                    <p>Your cart is empty</p>
                    <a routerLink="/store" class="btn-primary" (click)="closeCartDropdown()">Continue Shopping</a>
                  </div>
                </ng-template>
              </div>
            </div>

            <!-- User Profile Icon -->
            <div class="account-icon-wrapper" *ngIf="isAuthenticated(); else notAuthenticated">
              <button class="icon-btn" (click)="toggleAccountMenu()" title="Account">
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>
              <div class="account-dropdown" *ngIf="showAccountMenu()">
                <div class="account-dropdown-header">
                  <p class="account-user-info">{{ userEmail() }}</p>
                </div>
                <a routerLink="/profile" routerLinkActive="active" (click)="closeAccountMenu()">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile
                </a>
                <a routerLink="/my-orders" routerLinkActive="active" (click)="closeAccountMenu()">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <line x1="9" y1="12" x2="15" y2="12"></line>
                    <line x1="9" y1="16" x2="15" y2="16"></line>
                  </svg>
                  My Orders
                </a>
                <a
                  *ngIf="isAdminUser()"
                  routerLink="/admin"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: false }"
                  (click)="closeAccountMenu()"
                >
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                  Admin Dashboard
                </a>
                <div class="account-dropdown-divider"></div>
                <button (click)="logout()">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
            <ng-template #notAuthenticated>
              <a routerLink="/login" class="icon-btn" title="Sign In">
                <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
              </a>
            </ng-template>
          </div>
        </div>
      </header>

      <!-- Main Navigation -->
      <nav class="store-nav">
        <div class="store-nav__container">
          <a
            routerLink="/landing"
            [class.active]="activeCategory() === null"
            class="nav-link"
          >
            Home
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'rings' }"
            [class.active]="activeCategory() === 'rings'"
            class="nav-link"
          >
            Rings
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'necklaces' }"
            [class.active]="activeCategory() === 'necklaces'"
            class="nav-link"
          >
            Necklaces
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'earrings' }"
            [class.active]="activeCategory() === 'earrings'"
            class="nav-link"
          >
            Earrings
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'bracelets' }"
            [class.active]="activeCategory() === 'bracelets'"
            class="nav-link"
          >
            Bracelets
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'bangles' }"
            [class.active]="activeCategory() === 'bangles'"
            class="nav-link"
          >
            Bangles
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'pendants' }"
            [class.active]="activeCategory() === 'pendants'"
            class="nav-link"
          >
            Pendants
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'mangalsutra' }"
            [class.active]="activeCategory() === 'mangalsutra'"
            class="nav-link"
          >
            Mangalsutra
          </a>
          <a
            routerLink="/store"
            [queryParams]="{ category: 'all' }"
            [class.active]="activeCategory() === 'all'"
            class="nav-link"
          >
            All Collections
          </a>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="store-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="store-footer">
        <div class="footer-top">
          <div class="footer-logo">
            <a routerLink="/landing" class="footer-logo-link">
              <img src="/assets/premium.png" alt="Premium Jewelry" class="footer-logo-icon" />
              <span class="footer-logo-text">{{ (tenantBrand$ | async) ?? 'Premium Jewelry' }}</span>
            </a>
          </div>
          <div class="footer-top-icons">
            <a routerLink="/login" class="footer-icon-btn" title="Account">
              <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </a>
            <a href="#" class="footer-icon-btn" title="Wishlist">
              <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </a>
            <button class="footer-icon-btn" (click)="toggleCartDropdown()" title="Cart">
              <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="store-footer__container">
          <div class="footer-section">
            <h4>EXPLORE</h4>
            <a href="#">About Us</a>
            <a href="#">Collections</a>
            <a href="#">New Arrivals</a>
          </div>
          <div class="footer-section">
            <h4>SUPPORT</h4>
            <a href="#">Customer Service</a>
            <a href="#">Shipping Info</a>
            <a href="#">Returns</a>
          </div>
          <div class="footer-section">
            <h4>ENGAGE</h4>
            <a href="#">Blog</a>
            <a href="#">Newsletter</a>
            <a href="#">Events</a>
          </div>
          <div class="footer-section">
            <h4>CONNECT</h4>
            <a href="#">Contact Us</a>
            <a href="#">Careers</a>
            <a href="#">Partnerships</a>
          </div>
          <div class="footer-newsletter">
            <h4>JOIN OUR NEWSLETTER</h4>
            <div class="newsletter-input-wrapper">
              <input
                type="email"
                placeholder="Enter your email"
                class="newsletter-input"
                #newsletterInput
              />
              <button class="newsletter-btn" (click)="subscribeNewsletter(newsletterInput.value)">
                <svg class="newsletter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m21 21-4.35-4.35"></path>
                  <circle cx="11" cy="11" r="8"></circle>
                </svg>
              </button>
            </div>
            <p class="footer-copyright">&copy; 2024 {{ (tenantBrand$ | async) ?? 'Premium Jewelry' }}. All rights reserved.</p>
            <div class="footer-social">
              <a href="#" class="social-icon" title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#" class="social-icon" title="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" class="social-icon" title="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class StoreLayoutComponent implements OnInit {
  cartCount$ = this.store.select(selectCartItemCount);
  cartItems$ = this.store.select(selectCartItems);
  cartTotal$ = this.store.select(selectCartTotal);
  showAccountMenuFlag = signal(false);
  showCartDropdownFlag = signal(false);
  activeCategory = signal<string | null>(null);
  tenantBrand$ = this.brandingService.tenantBrandChanges$;
  userEmail = () => {
    const user = this.authService.getStoredUser();
    return user?.email || 'User';
  };

  constructor(
    private readonly store: Store<AppState>,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly brandingService: BrandingService
  ) {}

  ngOnInit(): void {
    // Update active category on route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveCategory();
      });

    // Initial update
    this.updateActiveCategory();
  }

  private updateActiveCategory(): void {
    const category = this.route.snapshot.queryParams['category'];
    this.activeCategory.set(category || null);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isAdminUser(): boolean {
    const role = this.authService.getStoredUser()?.role?.toLowerCase().replace(/[^a-z]/g, '');
    return role === 'superadmin' || role === 'tenantadmin';
  }

  showAccountMenu(): boolean {
    return this.showAccountMenuFlag();
  }

  toggleAccountMenu(): void {
    this.showAccountMenuFlag.set(!this.showAccountMenuFlag());
    if (this.showAccountMenuFlag()) {
      this.showCartDropdownFlag.set(false);
    }
  }

  closeAccountMenu(): void {
    this.showAccountMenuFlag.set(false);
  }

  showCartDropdown(): boolean {
    return this.showCartDropdownFlag();
  }

  toggleCartDropdown(): void {
    this.showCartDropdownFlag.set(!this.showCartDropdownFlag());
    if (this.showCartDropdownFlag()) {
      this.showAccountMenuFlag.set(false);
    }
  }

  closeCartDropdown(): void {
    this.showCartDropdownFlag.set(false);
  }

  removeItem(productId: string): void {
    this.store.dispatch(CartActions.removeItem({ productId }));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.cart-menu') && !target.closest('.account-icon-wrapper')) {
      this.showCartDropdownFlag.set(false);
      this.showAccountMenuFlag.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeAccountMenu();
  }

  subscribeNewsletter(email: string): void {
    if (email && email.includes('@')) {
      // TODO: Implement newsletter subscription
      console.log('Newsletter subscription:', email);
      alert('Thank you for subscribing to our newsletter!');
    }
  }

  onSearch(query: string): void {
    if (query.trim()) {
      this.router.navigate(['/store'], { queryParams: { search: query.trim() } });
    }
  }
}