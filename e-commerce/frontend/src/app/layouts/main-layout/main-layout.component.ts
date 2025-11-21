import { AsyncPipe, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs/operators';

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
        width: 280px;
        background: #2d2d2d;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
        box-shadow: 2px 0 20px rgba(0, 0, 0, 0.4);
        position: sticky;
        top: 0;
        height: 100vh;
        overflow-y: auto;
      }
      .sidebar__header {
        padding: 1.75rem 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(120deg, rgba(212, 175, 55, 0.15), rgba(183, 110, 121, 0.15));
      }
      .sidebar__header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 800;
        color: #ffffff;
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.01em;
      }
      .sidebar__nav {
        flex: 1;
        padding: 1rem 0;
      }
      .sidebar__nav a {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 0.875rem 1.5rem;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        transition: all 0.3s ease;
        font-weight: 500;
        font-size: 0.95rem;
        position: relative;
      }
      .sidebar__nav a:hover {
        background: rgba(212, 175, 55, 0.1);
        color: #ffffff;
        padding-left: 1.75rem;
      }
      .sidebar__nav a.active {
        background: rgba(212, 175, 55, 0.2);
        color: #d4af37;
        border-left: 3px solid #d4af37;
        font-weight: 700;
        box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.15);
      }
      .sidebar__nav a.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #d4af37;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
      }
      .sidebar__nav a span {
        font-size: 1.25rem;
        filter: grayscale(0);
        transition: transform 0.3s ease;
      }
      .sidebar__nav a:hover span {
        transform: scale(1.1);
      }
      .layout__main {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--premium-pearl);
        min-width: 0;
      }
      .layout__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 2rem;
        background: #2d2d2d;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .header__title h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.01em;
      }
      .header__actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }
      .btn-link {
        padding: 0.625rem 1.25rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50px;
        color: #ffffff;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .btn-link:hover {
        background: rgba(212, 175, 55, 0.2);
        border-color: #d4af37;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      }
      .btn-icon,
      .btn-user {
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        color: #ffffff;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }
      .btn-icon:hover,
      .btn-user:hover {
        background: rgba(212, 175, 55, 0.2);
        border-color: #d4af37;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      }
      .btn-cart {
        position: relative;
        padding: 0.625rem 1.25rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50px;
        color: #ffffff;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .btn-cart:hover {
        background: rgba(212, 175, 55, 0.2);
        border-color: #d4af37;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      }
      .cart-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: #fff;
        border-radius: 50%;
        min-width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        border: 2px solid #2d2d2d;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
      }
      .layout__content {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
        background: var(--premium-pearl);
      }
      @media (max-width: 1024px) {
        .layout__sidebar {
          width: 240px;
        }
        .layout__header {
          padding: 1rem 1.5rem;
        }
        .header__title h1 {
          font-size: 1.5rem;
        }
      }
      @media (max-width: 768px) {
        .layout {
          flex-direction: column;
        }
        .layout__sidebar {
          width: 100%;
          height: auto;
          position: relative;
          max-height: 60vh;
        }
        .layout__header {
          padding: 1rem;
        }
        .header__actions {
          gap: 0.5rem;
        }
        .btn-link,
        .btn-cart {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }
        .btn-icon,
        .btn-user {
          width: 40px;
          height: 40px;
          padding: 0.5rem;
        }
        .layout__content {
          padding: 1.5rem 1rem;
        }
      }
    `,
  ],
})
export class MainLayoutComponent implements OnInit {
  pageTitle = 'Dashboard';
  cartCount$ = this.store.select(selectCartItemCount);
  private readonly userRole = this.authService.getStoredUser()?.role ?? null;

  private readonly titleMap: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/products': 'Products',
    '/admin/orders': 'Orders',
    '/admin/returns': 'Returns',
    '/admin/discounts': 'Discounts',
    '/admin/tenants': 'Tenants',
    '/admin/users': 'Users',
    '/admin/masters': 'Master Data',
    '/admin/audit-logs': 'Audit Logs',
  };

  constructor(
    private readonly store: Store<AppState>,
    private readonly brandingService: BrandingService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Update page title based on route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url.split('?')[0];
        this.pageTitle = this.titleMap[url] || 'Dashboard';
      });

    // Set initial title
    const url = this.router.url.split('?')[0];
    this.pageTitle = this.titleMap[url] || 'Dashboard';
  }

  brandTitle(): string {
    return this.brandingService.getAdminBrand(this.userRole);
  }

  isSuperAdmin(): boolean {
    const role = (this.userRole ?? '').toLowerCase();
    return role === 'superadmin' || role === 'super_admin';
  }
}

