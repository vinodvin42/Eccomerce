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
  template: `
    <div class="store-layout">
      <!-- Top Navigation Bar -->
      <header class="store-header">
        <div class="store-header__container">
          <!-- Logo -->
          <a routerLink="/store" class="store-logo">
            <span class="logo-icon">💎</span>
            <span class="logo-text">{{ (tenantBrand$ | async) ?? 'Premium Jewelry' }}</span>
          </a>

          <!-- Search Bar -->
          <div class="store-search">
            <input
              type="search"
              placeholder="Search products..."
              class="search-input"
              #searchInput
              (keyup.enter)="onSearch(searchInput.value)"
            />
            <button class="search-btn" (click)="onSearch(searchInput.value)">🔍</button>
          </div>

          <!-- Right Actions -->
          <div class="store-actions">
          <a *ngIf="isAdminUser()" routerLink="/admin/dashboard" class="btn-admin">Admin</a>
            <!-- Account Menu -->
            <div class="account-menu" *ngIf="isAuthenticated(); else notAuthenticated">
              <button class="account-btn" (click)="toggleAccountMenu()">
                <span class="account-icon">👤</span>
                <span class="account-text">{{ userEmail() }}</span>
                <span class="dropdown-arrow">▼</span>
              </button>
              <div class="account-dropdown" *ngIf="showAccountMenu()">
                <a routerLink="/my-orders" routerLinkActive="active" (click)="closeAccountMenu()">My Orders</a>
                <a
                  *ngIf="isAdminUser()"
                  routerLink="/admin"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: false }"
                  (click)="closeAccountMenu()"
                >
                  Admin Dashboard
                </a>
                <button (click)="logout()">Logout</button>
              </div>
            </div>
            <ng-template #notAuthenticated>
              <a routerLink="/login" class="btn-login">Sign In</a>
            </ng-template>

            <!-- Cart Dropdown -->
            <div class="cart-menu">
              <button class="cart-btn" (click)="toggleCartDropdown()">
                <span class="cart-icon">🛒</span>
                <span class="cart-text">Cart</span>
                <span *ngIf="(cartCount$ | async)! > 0" class="cart-badge">
                  {{ cartCount$ | async }}
                </span>
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
                    <a routerLink="/checkout" class="btn-proceed-checkout" (click)="closeCartDropdown()">
                      Proceed to Checkout
                    </a>
                    <p class="cart-dropdown-note">Secure checkout • 60-day returns • Lifetime support</p>
                  </div>
                </div>
                <ng-template #emptyCart>
                  <div class="cart-empty">
                    <p>Your cart is empty</p>
                    <a routerLink="/store" class="btn-continue-shopping" (click)="closeCartDropdown()">Continue Shopping</a>
                  </div>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Navigation -->
      <nav class="store-nav">
        <div class="store-nav__container">
          <a
            routerLink="/store"
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
        <div class="store-footer__container">
          <div class="footer-section">
            <h4>About</h4>
            <a href="#">About Us</a>
            <a href="#">Contact</a>
            <a href="#">Careers</a>
          </div>
          <div class="footer-section">
            <h4>Customer Service</h4>
            <a href="#">Shipping Info</a>
            <a href="#">Returns</a>
            <a href="#">FAQ</a>
          </div>
          <div class="footer-section">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
          <div class="footer-section">
            <h4>Connect</h4>
            <a href="#">Facebook</a>
            <a href="#">Twitter</a>
            <a href="#">Instagram</a>
          </div>
        </div>
        <div class="footer-bottom">
        <p>&copy; 2024 {{ (tenantBrand$ | async) ?? 'Premium Jewelry' }}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [
    `
      .store-layout {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--premium-pearl);
        color: var(--premium-onyx);
      }

      /* Header */
      .store-header {
        background: #fff;
        border-bottom: 1px solid var(--premium-silver);
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(10px);
      }

      .store-header__container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 1.25rem 2rem;
        display: flex;
        align-items: center;
        gap: 2.5rem;
      }

      .store-logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        color: var(--premium-onyx);
        font-size: 1.625rem;
        font-weight: 800;
        white-space: nowrap;
        transition: all 0.3s;
        letter-spacing: -0.02em;
      }

      .store-logo:hover {
        color: var(--premium-rose-gold);
        transform: translateY(-1px);
      }

      .logo-icon {
        font-size: 2.25rem;
        background: linear-gradient(135deg, var(--premium-gold), var(--premium-rose-gold));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 2px 4px rgba(212, 175, 55, 0.3));
      }

      .store-search {
        flex: 1;
        max-width: 650px;
        display: flex;
        gap: 0.75rem;
        position: relative;
      }

      .search-input {
        flex: 1;
        padding: 0.875rem 1.25rem;
        border: 2px solid var(--premium-silver);
        border-radius: 50px;
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        font-size: 0.95rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 400;
      }

      .search-input::placeholder {
        color: var(--premium-titanium);
        opacity: 0.7;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--premium-gold);
        background: #fff;
        box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);
      }

      .search-btn {
        padding: 0.875rem 1.75rem;
        background: var(--premium-onyx);
        color: #fff;
        border: none;
        border-radius: 50px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 50px;
      }

      .search-btn:hover {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(183, 110, 121, 0.3);
      }

      .search-btn:active {
        transform: translateY(0);
      }

      .store-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      
      .btn-admin {
        padding: 0.625rem 1.25rem;
        border-radius: 50px;
        border: 2px solid var(--premium-gold);
        color: var(--premium-gold);
        text-decoration: none;
        font-weight: 700;
        font-size: 0.875rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: transparent;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      
      .btn-admin:hover {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        border-color: transparent;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(212, 175, 55, 0.3);
      }

      .account-menu {
        position: relative;
      }

      .account-btn {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.625rem 1.125rem;
        background: var(--premium-moonstone);
        border: 2px solid var(--premium-silver);
        border-radius: 50px;
        color: var(--premium-onyx);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 0.875rem;
        font-weight: 600;
      }

      .account-btn:hover {
        background: #fff;
        border-color: var(--premium-rose-gold);
        box-shadow: 0 4px 12px rgba(183, 110, 121, 0.15);
        transform: translateY(-1px);
      }

      .account-icon {
        font-size: 1.125rem;
        color: var(--premium-rose-gold);
      }

      .dropdown-arrow {
        font-size: 0.75rem;
        color: var(--premium-titanium);
        transition: transform 0.3s;
      }

      .account-btn:hover .dropdown-arrow {
        color: var(--premium-rose-gold);
      }

      .account-dropdown {
        position: absolute;
        top: calc(100% + 0.75rem);
        right: 0;
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 12px;
        min-width: 220px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
        overflow: hidden;
        z-index: 1000;
      }

      .account-dropdown a,
      .account-dropdown button {
        display: block;
        width: 100%;
        padding: 0.875rem 1.25rem;
        text-align: left;
        background: transparent;
        border: none;
        color: var(--premium-onyx);
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.9rem;
        font-weight: 500;
        border-bottom: 1px solid var(--premium-moonstone);
      }

      .account-dropdown a:last-child,
      .account-dropdown button:last-child {
        border-bottom: none;
      }

      .account-dropdown a:hover,
      .account-dropdown button:hover {
        background: var(--premium-moonstone);
        color: var(--premium-rose-gold);
        padding-left: 1.5rem;
      }

      .account-dropdown a.active {
        background: rgba(183, 110, 121, 0.1);
        color: var(--premium-rose-gold);
        font-weight: 700;
        border-left: 3px solid var(--premium-rose-gold);
      }

      .btn-login {
        padding: 0.625rem 1.5rem;
        background: var(--premium-onyx);
        color: #fff;
        text-decoration: none;
        border-radius: 50px;
        font-weight: 700;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 0.875rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .btn-login:hover {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(183, 110, 121, 0.3);
      }

      .cart-menu {
        position: relative;
      }

      .cart-btn {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.625rem 1.125rem;
        background: var(--premium-moonstone);
        border: 2px solid var(--premium-silver);
        border-radius: 50px;
        color: var(--premium-onyx);
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 0.875rem;
        cursor: pointer;
      }

      .cart-btn:hover {
        background: #fff;
        border-color: var(--premium-gold);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
        transform: translateY(-1px);
      }

      .cart-icon {
        font-size: 1.125rem;
        color: var(--premium-rose-gold);
      }

      .cart-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: linear-gradient(135deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        border-radius: 50%;
        min-width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 800;
        box-shadow: 0 2px 8px rgba(183, 110, 121, 0.4);
        border: 2px solid #fff;
      }

      .cart-dropdown {
        position: absolute;
        top: calc(100% + 0.75rem);
        right: 0;
        width: 420px;
        max-width: 90vw;
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .cart-dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 1.75rem;
        border-bottom: 1px solid var(--premium-silver);
        background: linear-gradient(180deg, #fff 0%, var(--premium-moonstone) 100%);
      }

      .cart-dropdown-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--premium-onyx);
        letter-spacing: -0.01em;
      }

      .close-cart {
        background: var(--premium-moonstone);
        border: none;
        font-size: 1.5rem;
        color: var(--premium-titanium);
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
        line-height: 1;
      }

      .close-cart:hover {
        background: var(--premium-silver);
        color: var(--premium-onyx);
        transform: rotate(90deg);
      }

      .cart-dropdown-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }

      .cart-dropdown-items {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem 0;
      }

      .cart-dropdown-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.75rem;
        border-bottom: 1px solid var(--premium-silver);
        transition: all 0.2s;
      }

      .cart-dropdown-item:hover {
        background: var(--premium-moonstone);
        padding-left: 2rem;
      }

      .cart-item-thumb {
        width: 70px;
        height: 70px;
        object-fit: cover;
        border-radius: 8px;
        border: 2px solid var(--premium-silver);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .cart-item-info {
        flex: 1;
        min-width: 0;
      }

      .cart-item-name {
        margin: 0 0 0.375rem 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--premium-onyx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cart-item-price {
        margin: 0;
        font-size: 0.875rem;
        color: var(--premium-titanium);
        font-weight: 600;
      }

      .remove-item {
        background: var(--premium-moonstone);
        border: none;
        font-size: 1.25rem;
        color: var(--premium-titanium);
        cursor: pointer;
        padding: 0.375rem;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
        line-height: 1;
      }

      .remove-item:hover {
        background: rgba(231, 70, 70, 0.1);
        color: #b42318;
        transform: scale(1.1);
      }

      .cart-dropdown-footer {
        padding: 1.5rem 1.75rem;
        border-top: 2px solid var(--premium-silver);
        background: linear-gradient(180deg, var(--premium-moonstone) 0%, #fff 100%);
      }

      .cart-dropdown-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        font-size: 1rem;
        color: var(--premium-onyx);
        font-weight: 600;
      }

      .cart-dropdown-total strong {
        font-size: 1.5rem;
        color: var(--premium-rose-gold);
        font-weight: 800;
      }

      .btn-proceed-checkout {
        display: block;
        width: 100%;
        padding: 0.875rem 1.5rem;
        background: linear-gradient(120deg, #D4AF37, #b76e79);
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 700;
        text-align: center;
        transition: all 0.3s;
        margin-bottom: 0.75rem;
      }

      .btn-proceed-checkout:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      }

      .cart-dropdown-note {
        margin: 0;
        font-size: 0.75rem;
        color: var(--premium-titanium);
        text-align: center;
        font-weight: 500;
      }

      .cart-empty {
        padding: 3rem 1.75rem;
        text-align: center;
      }

      .cart-empty p {
        margin: 0 0 1.5rem 0;
        color: var(--premium-titanium);
        font-size: 1rem;
        font-weight: 500;
      }

      .btn-continue-shopping {
        display: inline-block;
        padding: 0.875rem 1.75rem;
        background: var(--premium-onyx);
        color: #fff;
        text-decoration: none;
        border-radius: 50px;
        font-weight: 700;
        font-size: 0.875rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .btn-continue-shopping:hover {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(183, 110, 121, 0.3);
      }

      /* Navigation */
      .store-nav {
        background: var(--premium-pearl);
        border-bottom: 1px solid var(--premium-silver);
      }

      .store-nav__container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
      }

      .nav-link {
        padding: 1rem 0;
        color: var(--premium-titanium);
        text-decoration: none;
        font-weight: 500;
        border-bottom: 2px solid transparent;
        transition: all 0.3s;
        position: relative;
        font-size: 0.95rem;
        text-transform: capitalize;
      }

      .nav-link:hover {
        color: var(--premium-rose-gold);
      }

      .nav-link.active {
        color: var(--premium-gold);
        border-bottom-color: var(--premium-gold);
        font-weight: 700;
        background: linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.08) 100%);
      }

      /* Content */
      .store-content {
        flex: 1;
        max-width: 1400px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem;
        background: var(--premium-pearl);
      }

      /* Footer */
      .store-footer {
        background: var(--premium-moonstone);
        border-top: 1px solid var(--premium-silver);
        margin-top: 4rem;
      }

      .store-footer__container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 3rem 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 2rem;
      }

      .footer-section h4 {
        margin: 0 0 1rem 0;
        color: #1a1a1a;
        font-size: 1rem;
        font-weight: 600;
      }

      .footer-section a {
        display: block;
        color: #666666;
        text-decoration: none;
        margin-bottom: 0.5rem;
        transition: all 0.3s;
        font-size: 0.9rem;
      }

      .footer-section a:hover {
        color: var(--premium-gold);
      }

      .footer-bottom {
        border-top: 1px solid var(--premium-silver);
        padding: 1.5rem 2rem;
        text-align: center;
        color: var(--premium-titanium);
        font-size: 0.85rem;
      }

      .footer-bottom p {
        margin: 0;
      }
    `,
  ],
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
    if (!target.closest('.cart-menu') && !target.closest('.account-menu')) {
      this.showCartDropdownFlag.set(false);
      this.showAccountMenuFlag.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeAccountMenu();
  }

  onSearch(query: string): void {
    if (query.trim()) {
      this.router.navigate(['/store'], { queryParams: { search: query.trim() } });
    }
  }
}

