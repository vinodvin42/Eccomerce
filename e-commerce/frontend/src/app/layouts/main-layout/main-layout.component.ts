import { AsyncPipe, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';

import { selectCartItemCount } from '../../state/cart/cart.selectors';
import type { AppState } from '../../state';
import { BrandingService } from '../../core/services/branding.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="layout__sidebar">
        <div class="sidebar__header">
        <h2>{{ brandTitle() }}</h2>
        </div>
        <nav class="sidebar__nav">
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span>📊</span> Dashboard
          </a>
          <a routerLink="/admin/products" routerLinkActive="active">
            <span>📦</span> Products
          </a>
          <a routerLink="/admin/orders" routerLinkActive="active">
            <span>🛒</span> Orders
          </a>
          <a routerLink="/admin/returns" routerLinkActive="active">
            <span>↩️</span> Returns
          </a>
          <a routerLink="/admin/discounts" routerLinkActive="active">
            <span>🎟️</span> Discounts
          </a>
          <a *ngIf="isSuperAdmin()" routerLink="/admin/tenants" routerLinkActive="active">
            <span>🏢</span> Tenants
          </a>
          <a routerLink="/admin/users" routerLinkActive="active">
            <span>👥</span> Users
          </a>
          <a routerLink="/admin/masters" routerLinkActive="active">
            <span>⚙️</span> Master Data
          </a>
          <a routerLink="/admin/audit-logs" routerLinkActive="active">
            <span>📋</span> Audit Logs
          </a>
        </nav>
      </aside>
      <div class="layout__main">
        <header class="layout__header">
          <div class="header__title">
            <h1>{{ pageTitle }}</h1>
          </div>
          <div class="header__actions">
            <a routerLink="/store" class="btn-link">🛍️ Store</a>
            <a routerLink="/cart" class="btn-cart">
              🛒 Cart
              <span *ngIf="(cartCount$ | async)! > 0" class="cart-badge">
                {{ cartCount$ | async }}
              </span>
            </a>
            <button class="btn-icon" title="Notifications">🔔</button>
            <button class="btn-icon" title="Settings">⚙️</button>
            <button class="btn-user" title="User Menu">👤</button>
          </div>
        </header>
        <main class="layout__content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .layout {
        display: flex;
        min-height: 100vh;
        background: var(--premium-pearl);
        color: var(--premium-onyx);
      }
      .layout__sidebar {
        width: 260px;
        background: #fff;
        border-right: 1px solid var(--premium-silver);
        display: flex;
        flex-direction: column;
        box-shadow: 2px 0 20px var(--premium-shadow);
      }
      .sidebar__header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--premium-silver);
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .sidebar__header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--premium-rose-gold);
        background: none;
        -webkit-text-fill-color: var(--premium-rose-gold);
      }
      .sidebar__nav {
        flex: 1;
        padding: 1rem 0;
      }
      .sidebar__nav a {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.5rem;
        color: var(--premium-titanium);
        text-decoration: none;
        transition: all 0.2s;
      }
      .sidebar__nav a:hover {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
      }
      .sidebar__nav a.active {
        background: var(--premium-moonstone);
        color: var(--premium-rose-gold);
        border-left: 3px solid var(--premium-rose-gold);
        font-weight: 700;
        box-shadow: inset 0 0 20px rgba(183, 110, 121, 0.1);
      }
      .sidebar__nav a span {
        font-size: 1.25rem;
      }
      .layout__main {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--premium-pearl);
      }
      .layout__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: #fff;
        border-bottom: 1px solid var(--premium-silver);
        box-shadow: 0 2px 10px var(--premium-shadow);
      }
      .header__title h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--premium-onyx);
      }
      .header__actions {
        display: flex;
        gap: 0.5rem;
      }
      .btn-icon,
      .btn-user {
        padding: 0.5rem;
        background: var(--premium-moonstone);
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        color: var(--premium-onyx);
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-link {
        padding: 0.5rem 1rem;
        background: var(--premium-moonstone);
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        color: var(--premium-onyx);
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
      }
      .btn-link:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      .btn-cart {
        position: relative;
        padding: 0.5rem 1rem;
        background: var(--premium-moonstone);
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        color: var(--premium-onyx);
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
      }
      .btn-cart:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      .cart-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--premium-rose-gold);
        color: #fff;
        border-radius: 999px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .btn-icon:hover,
      .btn-user:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }
      .layout__content {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
        background: var(--premium-pearl);
      }
    `,
  ],
})
export class MainLayoutComponent {
  pageTitle = 'Dashboard';
  cartCount$ = this.store.select(selectCartItemCount);
  private readonly userRole = this.authService.getStoredUser()?.role ?? null;

  constructor(
    private readonly store: Store<AppState>,
    private readonly brandingService: BrandingService,
    private readonly authService: AuthService
  ) {}

  brandTitle(): string {
    return this.brandingService.getAdminBrand(this.userRole);
  }

  isSuperAdmin(): boolean {
    return (this.userRole ?? '').toLowerCase() === 'super_admin';
  }
}

