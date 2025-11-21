import { CurrencyPipe, DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { ReportsService } from '../../core/services/reports.service';
import { ShippingMethodService } from '../../core/services/shipping-method.service';
import type { Category } from '../../shared/models/category';
import type { PaymentMethod } from '../../shared/models/payment-method';
import type { DashboardResponse } from '../../shared/models/reports';
import type { ShippingMethod } from '../../shared/models/shipping-method';

type DashboardPeriod = 'day' | 'week' | 'month';
type DashboardRangePreset = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';

interface DashboardFilters {
  startDate: string | null;
  endDate: string | null;
  period: DashboardPeriod;
  preset: DashboardRangePreset;
}

interface RangePreset {
  key: DashboardRangePreset;
  label: string;
  description: string;
  days?: number;
  period: DashboardPeriod;
}

interface DashboardInsight {
  message: string;
  detail: string;
  level: 'warning' | 'positive' | 'info';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, CurrencyPipe, DatePipe, TitleCasePipe, RouterLink, FormsModule],
  template: `
    <div class="dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p class="dashboard-subtitle">Real-time overview of your business performance</p>
        </div>
        <div class="header-actions">
          <div class="last-updated" *ngIf="lastUpdated()">
            Last updated: {{ lastUpdated() | date: 'medium' }}
          </div>
          <button class="btn-secondary" type="button" (click)="toggleFilters()">
            {{ showFilters() ? 'Hide Filters' : 'Show Filters' }}
          </button>
          <button class="btn-refresh" (click)="refreshDashboard()" [disabled]="loading()">
            <span>🔄</span>
            {{ loading() ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="filters-panel" *ngIf="showFilters()">
        <div class="preset-buttons">
          <button
            *ngFor="let preset of rangePresets"
            type="button"
            class="preset-btn"
            [class.active]="filters().preset === preset.key"
            (click)="applyPreset(preset.key)"
          >
            <span class="preset-label">{{ preset.label }}</span>
            <small>{{ preset.description }}</small>
          </button>
        </div>
        <div class="filter-controls">
          <div class="control-group">
            <label for="period">Period Granularity</label>
            <select
              id="period"
              class="control-select"
              [ngModel]="filters().period"
              (ngModelChange)="onPeriodChange($event)"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div class="control-group">
            <label for="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              class="control-input"
              [ngModel]="filters().startDate ?? ''"
              (ngModelChange)="onCustomDateChange('startDate', $event)"
            />
          </div>
          <div class="control-group">
            <label for="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              class="control-input"
              [ngModel]="filters().endDate ?? ''"
              (ngModelChange)="onCustomDateChange('endDate', $event)"
            />
          </div>
          <div class="control-actions">
            <button class="btn-primary" type="button" (click)="applyCustomRange()" [disabled]="loading()">
              Apply Range
            </button>
            <button class="btn-secondary" type="button" (click)="resetFilters()" [disabled]="loading()">
              Reset
            </button>
          </div>
        </div>
        <div class="filter-summary">
          <span class="filter-pill">
            <strong>Range:</strong> {{ activeRangeLabel() }}
          </span>
          <span class="filter-pill">
            <strong>Period:</strong> {{ filters().period | titlecase }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading() && !errorMessage()" class="loading-container">
        <div class="spinner-large"></div>
        <p>Loading dashboard data...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage() && !loading()" class="error-container">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <h2>Unable to Load Dashboard</h2>
          <p>{{ errorMessage() }}</p>
          <div class="error-actions">
            <button class="btn-primary" (click)="refreshDashboard()">Try Again</button>
            <a *ngIf="errorMessage()?.includes('log in')" routerLink="/login" class="btn-secondary">
              Go to Login
            </a>
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <ng-container *ngIf="dashboard() as dashboard">
        <div *ngIf="dashboard && !loading() && !errorMessage()" class="dashboard-content">
        <!-- Insights -->
        <div class="insights-panel" *ngIf="insights().length">
          <h2>Operational Insights</h2>
          <div class="insight-list">
            <div class="insight-item" *ngFor="let insight of insights()">
              <span class="insight-badge" [class.warning]="insight.level === 'warning'" [class.positive]="insight.level === 'positive'">
                {{ insight.level === 'warning' ? '⚠️' : insight.level === 'positive' ? '✅' : 'ℹ️' }}
              </span>
              <div>
                <p class="insight-message">{{ insight.message }}</p>
                <small class="insight-detail">{{ insight.detail }}</small>
              </div>
            </div>
          </div>
        </div>
        <!-- Key Metrics Cards -->
        <div class="metrics-grid">
          <div class="metric-card revenue">
            <div class="metric-icon">💰</div>
            <div class="metric-content">
              <h3>Total Revenue</h3>
              <p class="metric-value">
                {{ dashboard.sales_summary.total_revenue | currency : dashboard.sales_summary.currency }}
              </p>
              <p class="metric-label">Last 30 days</p>
            </div>
          </div>

          <div class="metric-card orders">
            <div class="metric-icon">📦</div>
            <div class="metric-content">
              <h3>Total Orders</h3>
              <p class="metric-value">{{ dashboard.sales_summary.total_orders }}</p>
              <p class="metric-label">Confirmed orders</p>
            </div>
          </div>

          <div class="metric-card avg-order">
            <div class="metric-icon">📊</div>
            <div class="metric-content">
              <h3>Average Order Value</h3>
              <p class="metric-value">
                {{ dashboard.sales_summary.average_order_value | currency : dashboard.sales_summary.currency }}
              </p>
              <p class="metric-label">Per order</p>
            </div>
          </div>

          <div class="metric-card products">
            <div class="metric-icon">🛍️</div>
            <div class="metric-content">
              <h3>Total Products</h3>
              <p class="metric-value">{{ dashboard.product_stats.total_products }}</p>
              <p class="metric-label">In catalog</p>
            </div>
          </div>
        </div>

        <!-- Secondary Stats -->
        <div class="stats-row">
          <div class="stat-panel">
            <h2>Order Statistics</h2>
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-label">Total Orders</span>
                <span class="stat-value">{{ dashboard.order_stats.total_orders }}</span>
              </div>
              <div class="stat-item confirmed">
                <span class="stat-label">Confirmed</span>
                <span class="stat-value">{{ dashboard.order_stats.confirmed_orders }}</span>
              </div>
              <div class="stat-item pending">
                <span class="stat-label">Pending</span>
                <span class="stat-value">{{ dashboard.order_stats.pending_orders }}</span>
              </div>
              <div class="stat-item cancelled">
                <span class="stat-label">Cancelled</span>
                <span class="stat-value">{{ dashboard.order_stats.cancelled_orders }}</span>
              </div>
            </div>
          </div>

          <div class="stat-panel">
            <h2>Inventory Status</h2>
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-label">Total Products</span>
                <span class="stat-value">{{ dashboard.product_stats.total_products }}</span>
              </div>
              <div class="stat-item warning">
                <span class="stat-label">Low Stock</span>
                <span class="stat-value">{{ dashboard.product_stats.low_inventory_count }}</span>
              </div>
              <div class="stat-item danger">
                <span class="stat-label">Out of Stock</span>
                <span class="stat-value">{{ dashboard.product_stats.out_of_stock_count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Products Table -->
        <div class="data-panel">
          <div class="panel-header">
            <h2>Top Selling Products</h2>
            <p class="panel-subtitle">Best performers in the last 30 days</p>
          </div>
          <div *ngIf="dashboard.top_products.length > 0; else noTopProducts" class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let product of dashboard.top_products; let i = index">
                  <td class="rank-cell">
                    <span class="rank-badge" [class.top-3]="i < 3">{{ i + 1 }}</span>
                  </td>
                  <td class="product-name-cell">{{ product.product_name }}</td>
                  <td class="sku-cell">
                    <code>{{ product.sku }}</code>
                  </td>
                  <td class="quantity-cell">{{ product.total_quantity_sold }}</td>
                  <td class="revenue-cell">
                    <strong>{{ product.total_revenue | currency : product.currency }}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noTopProducts>
            <div class="empty-data">
              <span class="empty-icon">📊</span>
              <p>No sales data available for the selected period.</p>
              <a routerLink="/products" class="link-primary">View Products</a>
            </div>
          </ng-template>
        </div>

        <!-- Revenue Timeline -->
        <div class="data-panel">
          <div class="panel-header">
            <h2>Revenue by Period</h2>
            <p class="panel-subtitle">Daily breakdown of revenue</p>
          </div>
          <div *ngIf="dashboard.revenue_by_period.length > 0; else noRevenueData" class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let period of dashboard.revenue_by_period">
                  <td class="period-cell">{{ period.period }}</td>
                  <td class="orders-cell">{{ period.order_count }}</td>
                  <td class="revenue-cell">
                    <strong>{{ period.revenue | currency : period.currency }}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noRevenueData>
            <div class="empty-data">
              <span class="empty-icon">📈</span>
              <p>No revenue data available for the selected period.</p>
            </div>
          </ng-template>
        </div>

        <!-- Master Data Overview -->
        <div class="masters-section">
          <h2 class="section-title">Master Data Overview</h2>
          <div class="masters-grid">
            <!-- Categories -->
            <div class="master-card">
              <div class="master-header">
                <span class="master-icon">📁</span>
                <h3>Categories</h3>
              </div>
              <div *ngIf="categoriesLoading()" class="master-loading">Loading...</div>
              <div *ngIf="!categoriesLoading()" class="master-content">
                <div class="master-stat">
                  <span class="stat-label">Total Categories</span>
                  <span class="stat-value">{{ categories().length }}</span>
                </div>
                <div class="master-stat">
                  <span class="stat-label">Active</span>
                  <span class="stat-value active">{{ getActiveCount(categories()) }}</span>
                </div>
                <div *ngIf="categories().length > 0" class="master-list">
                  <div *ngFor="let category of categories().slice(0, 5)" class="master-item">
                    <span>{{ category.name }}</span>
                    <span class="badge" [class.active]="category.isActive" [class.inactive]="!category.isActive">
                      {{ category.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div *ngIf="categories().length > 5" class="master-more">
                    +{{ categories().length - 5 }} more
                  </div>
                </div>
                <div *ngIf="categories().length === 0" class="master-empty">
                  <p>No categories found</p>
                </div>
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="master-card">
              <div class="master-header">
                <span class="master-icon">💳</span>
                <h3>Payment Methods</h3>
              </div>
              <div *ngIf="paymentMethodsLoading()" class="master-loading">Loading...</div>
              <div *ngIf="!paymentMethodsLoading()" class="master-content">
                <div class="master-stat">
                  <span class="stat-label">Total Methods</span>
                  <span class="stat-value">{{ paymentMethods().length }}</span>
                </div>
                <div class="master-stat">
                  <span class="stat-label">Active</span>
                  <span class="stat-value active">{{ getActiveCount(paymentMethods()) }}</span>
                </div>
                <div *ngIf="paymentMethods().length > 0" class="master-list">
                  <div *ngFor="let method of paymentMethods().slice(0, 5)" class="master-item">
                    <span>{{ method.name }}</span>
                    <span class="badge type-badge">{{ method.type }}</span>
                  </div>
                  <div *ngIf="paymentMethods().length > 5" class="master-more">
                    +{{ paymentMethods().length - 5 }} more
                  </div>
                </div>
                <div *ngIf="paymentMethods().length === 0" class="master-empty">
                  <p>No payment methods found</p>
                </div>
              </div>
            </div>

            <!-- Shipping Methods -->
            <div class="master-card">
              <div class="master-header">
                <span class="master-icon">🚚</span>
                <h3>Shipping Methods</h3>
              </div>
              <div *ngIf="shippingMethodsLoading()" class="master-loading">Loading...</div>
              <div *ngIf="!shippingMethodsLoading()" class="master-content">
                <div class="master-stat">
                  <span class="stat-label">Total Methods</span>
                  <span class="stat-value">{{ shippingMethods().length }}</span>
                </div>
                <div class="master-stat">
                  <span class="stat-label">Active</span>
                  <span class="stat-value active">{{ getActiveCount(shippingMethods()) }}</span>
                </div>
                <div *ngIf="shippingMethods().length > 0" class="master-list">
                  <div *ngFor="let method of shippingMethods().slice(0, 5)" class="master-item">
                    <span>{{ method.name }}</span>
                    <span class="badge" [class.express]="method.isExpress">
                      {{ method.isExpress ? 'Express' : 'Standard' }}
                    </span>
                  </div>
                  <div *ngIf="shippingMethods().length > 5" class="master-more">
                    +{{ shippingMethods().length - 5 }} more
                  </div>
                </div>
                <div *ngIf="shippingMethods().length === 0" class="master-empty">
                  <p>No shipping methods found</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .dashboard {
        padding: 2rem;
        max-width: 1600px;
        margin: 0 auto;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .dashboard-header h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2.5rem;
        font-weight: 800;
        color: var(--premium-onyx);
      }

      .dashboard-subtitle {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 1.125rem;
      }

      .header-actions {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .last-updated {
        font-size: 0.875rem;
        color: var(--premium-titanium);
      }

      .btn-refresh,
      .btn-primary,
      .btn-secondary {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .btn-refresh {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        border: 1px solid var(--premium-silver);
      }

      .btn-refresh:hover:not(:disabled) {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }

      .btn-refresh:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
      }

      .btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .btn-secondary {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        border: 1px solid var(--premium-silver);
      }

      .btn-secondary:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }

      .filters-panel {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .preset-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .preset-btn {
        flex: 1;
        min-width: 160px;
        border: 1px solid var(--premium-silver);
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.2s, transform 0.2s, background 0.2s;
      }

      .preset-btn:hover {
        border-color: var(--premium-rose-gold);
        transform: translateY(-2px);
        background: #fff;
      }

      .preset-btn.active {
        border-color: var(--premium-rose-gold);
        background: rgba(183, 110, 121, 0.1);
      }

      .preset-label {
        display: block;
        font-weight: 600;
      }

      .filter-controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        align-items: center;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .control-group label {
        font-size: 0.875rem;
        color: var(--premium-titanium);
        font-weight: 600;
      }

      .control-select,
      .control-input {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
        color: var(--premium-onyx);
        font-size: 0.95rem;
      }

      .control-select:focus,
      .control-input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .control-actions {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
      }

      .filter-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .filter-pill {
        background: rgba(183, 110, 121, 0.12);
        color: var(--premium-rose-gold);
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        font-size: 0.875rem;
      }

      .loading-container,
      .error-container {
        text-align: center;
        padding: 6rem 2rem;
      }

      .spinner-large {
        width: 64px;
        height: 64px;
        border: 5px solid var(--premium-silver);
        border-top-color: var(--premium-rose-gold);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1.5rem;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .error-content {
        max-width: 500px;
        margin: 0 auto;
      }

      .error-icon {
        font-size: 4rem;
        display: block;
        margin-bottom: 1rem;
      }

      .error-content h2 {
        margin: 0 0 0.5rem 0;
        color: var(--premium-onyx);
      }

      .error-content p {
        margin: 0 0 2rem 0;
        color: var(--premium-titanium);
      }

      .error-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .metric-card {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .metric-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 60px rgba(183, 110, 121, 0.2);
        border-color: var(--premium-rose-gold);
      }

      .metric-icon {
        font-size: 3.5rem;
        opacity: 0.9;
      }

      .metric-content h3 {
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
        color: var(--premium-titanium);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .metric-value {
        margin: 0 0 0.25rem 0;
        font-size: 2rem;
        font-weight: 800;
        color: var(--premium-onyx);
        line-height: 1;
      }

      .metric-label {
        margin: 0;
        font-size: 0.875rem;
        color: var(--premium-titanium);
      }

      .stats-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .stat-panel {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }

      .stat-panel h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        color: var(--premium-onyx);
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: var(--premium-moonstone);
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
      }

      .stat-item.confirmed .stat-value {
        color: #10b981;
      }

      .stat-item.pending .stat-value {
        color: #f59e0b;
      }

      .stat-item.cancelled .stat-value {
        color: #ef4444;
      }

      .stat-item.warning .stat-value {
        color: #f59e0b;
      }

      .stat-item.danger .stat-value {
        color: #ef4444;
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--premium-titanium);
        font-weight: 600;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 800;
        color: var(--premium-onyx);
        line-height: 1;
      }

      .data-panel {
        background: #fff;
        padding: 2rem;
        border-radius: 1rem;
        margin-bottom: 2rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }

      .panel-header {
        margin-bottom: 1.5rem;
      }

      .panel-header h2 {
        margin: 0 0 0.25rem 0;
        font-size: 1.5rem;
        color: var(--premium-onyx);
      }

      .panel-subtitle {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 0.875rem;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
      }

      .data-table thead {
        background: var(--premium-moonstone);
      }

      .data-table th {
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--premium-titanium);
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 2px solid var(--premium-silver);
      }

      .data-table td {
        padding: 1rem;
        border-bottom: 1px solid var(--premium-silver);
        color: var(--premium-onyx);
      }

      .data-table tbody tr:hover {
        background: var(--premium-moonstone);
      }

      .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        font-weight: 700;
        font-size: 0.875rem;
        border: 1px solid var(--premium-silver);
      }

      .rank-badge.top-3 {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        border: none;
      }

      .product-name-cell {
        font-weight: 600;
        color: var(--premium-onyx);
      }

      .sku-cell code {
        background: rgba(183, 110, 121, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--premium-rose-gold);
      }

      .revenue-cell strong {
        color: #10b981;
        font-size: 1.125rem;
      }

      .empty-data {
        text-align: center;
        padding: 4rem 2rem;
      }

      .empty-icon {
        font-size: 4rem;
        opacity: 0.5;
        display: block;
        margin-bottom: 1rem;
      }

      .empty-data p {
        margin: 0 0 1.5rem 0;
        color: var(--premium-titanium);
      }

      .link-primary {
        color: var(--premium-rose-gold);
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s;
      }

      .link-primary:hover {
        color: var(--premium-gold);
        text-decoration: underline;
      }

      .insights-panel {
        background: #fff;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        border: 1px solid var(--premium-silver);
        box-shadow: 0 20px 40px var(--premium-shadow);
      }

      .insight-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
      }

      .insight-item {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
      }

      .insight-badge {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(59, 130, 246, 0.15);
        font-size: 1.25rem;
      }

      .insight-badge.warning {
        background: rgba(244, 114, 182, 0.15);
      }

      .insight-badge.positive {
        background: rgba(16, 185, 129, 0.15);
      }

      .insight-message {
        margin: 0;
        font-weight: 600;
        color: var(--premium-onyx);
      }

      .insight-detail {
        color: var(--premium-titanium);
      }

      .masters-section {
        margin-top: 2rem;
      }

      .section-title {
        margin: 0 0 1.5rem 0;
        font-size: 1.75rem;
        color: var(--premium-onyx);
        font-weight: 700;
      }

      .masters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .master-card {
        background: #fff;
        padding: 1.5rem;
        border-radius: 1rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }

      .master-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--premium-silver);
      }

      .master-icon {
        font-size: 2rem;
      }

      .master-header h3 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--premium-onyx);
        font-weight: 600;
      }

      .master-loading {
        text-align: center;
        padding: 2rem;
        color: var(--premium-titanium);
      }

      .master-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .master-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--premium-moonstone);
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
      }

      .master-stat .stat-label {
        font-size: 0.875rem;
        color: var(--premium-titanium);
        font-weight: 500;
      }

      .master-stat .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--premium-onyx);
      }

      .master-stat .stat-value.active {
        color: #10b981;
      }

      .master-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .master-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--premium-moonstone);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        color: var(--premium-onyx);
        border: 1px solid var(--premium-silver);
      }

      .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;
      }

      .badge.active {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .badge.inactive {
        background: rgba(148, 163, 184, 0.2);
        color: #94a3b8;
      }

      .badge.type-badge {
        background: rgba(183, 110, 121, 0.12);
        color: var(--premium-rose-gold);
      }

      .badge.express {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .master-more {
        text-align: center;
        padding: 0.5rem;
        color: var(--premium-titanium);
        font-size: 0.875rem;
        font-style: italic;
      }

      .master-empty {
        text-align: center;
        padding: 2rem;
        color: var(--premium-titanium);
        font-size: 0.875rem;
      }

      @media (max-width: 768px) {
        .dashboard {
          padding: 1rem;
        }

        .preset-buttons {
          flex-direction: column;
        }

        .filter-controls {
          grid-template-columns: 1fr;
        }

        .metrics-grid,
        .stats-row {
          grid-template-columns: 1fr;
        }

        .stat-grid {
          grid-template-columns: 1fr;
        }

        .masters-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly rangePresets: RangePreset[] = [
    { key: 'last_7_days', label: 'Last 7 Days', description: 'Quick health check', days: 7, period: 'day' },
    { key: 'last_30_days', label: 'Last 30 Days', description: 'Default rolling view', days: 30, period: 'day' },
    { key: 'last_90_days', label: 'Last 90 Days', description: 'Quarterly pulse', days: 90, period: 'week' },
    { key: 'custom', label: 'Custom Range', description: 'Pick specific dates', period: 'day' },
  ];

  dashboard = signal<DashboardResponse | null>(null);
  lastUpdated = signal<Date | null>(null);
  errorMessage = signal<string | null>(null);
  loading = signal(true);

  readonly filters = signal<DashboardFilters>({
    startDate: null,
    endDate: null,
    period: 'day',
    preset: 'last_30_days',
  });
  showFilters = signal(false);

  readonly activeRangeLabel = computed(() => {
    const filters = this.filters();
    if (filters.preset === 'custom' && filters.startDate && filters.endDate) {
      return `${filters.startDate} → ${filters.endDate}`;
    }
    return this.rangePresets.find((preset) => preset.key === filters.preset)?.label ?? 'Not set';
  });

  readonly insights = computed<DashboardInsight[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) {
      return [];
    }

    const insights: DashboardInsight[] = [];
    const { order_stats: orderStats, product_stats: productStats, top_products: topProducts } = dashboard;

    const pendingRatio =
      orderStats.total_orders > 0 ? orderStats.pending_orders / orderStats.total_orders : 0;
    if (pendingRatio > 0.2) {
      insights.push({
        level: 'warning',
        message: 'Pending orders are trending high',
        detail: `${Math.round(pendingRatio * 100)}% of orders are still pending.`,
      });
    }

    if (productStats.low_inventory_count > 0 || productStats.out_of_stock_count > 0) {
      insights.push({
        level: 'warning',
        message: 'Inventory risk detected',
        detail: `${productStats.low_inventory_count} low stock • ${productStats.out_of_stock_count} OOS products.`,
      });
    }

    const cancelledRatio =
      orderStats.total_orders > 0 ? orderStats.cancelled_orders / orderStats.total_orders : 0;
    if (cancelledRatio > 0.1) {
      insights.push({
        level: 'warning',
        message: 'Cancellation rate needs attention',
        detail: `${Math.round(cancelledRatio * 100)}% of orders were cancelled in this window.`,
      });
    }

    const topProduct = topProducts[0];
    if (topProduct) {
      const formattedRevenue = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: topProduct.currency,
      }).format(topProduct.total_revenue);
      insights.push({
        level: 'positive',
        message: `Top performer: ${topProduct.product_name}`,
        detail: `${topProduct.total_quantity_sold} units • ${formattedRevenue}`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        level: 'info',
        message: 'Operations look stable',
        detail: 'No anomalous signals detected for the selected range.',
      });
    }

    return insights;
  });

  // Master data
  categories = signal<Category[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  shippingMethods = signal<ShippingMethod[]>([]);
  categoriesLoading = signal(false);
  paymentMethodsLoading = signal(false);
  shippingMethodsLoading = signal(false);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly categoryService: CategoryService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly shippingMethodService: ShippingMethodService
  ) {}

  ngOnInit(): void {
    this.applyPreset('last_30_days');
    this.loadMasterData();
  }

  refreshDashboard(): void {
    this.loadDashboard();
    this.loadMasterData();
  }

  applyPreset(preset: DashboardRangePreset): void {
    if (preset === 'custom') {
      this.filters.update((current) => ({ ...current, preset }));
      return;
    }
    const config = this.rangePresets.find((option) => option.key === preset);
    if (!config?.days) {
      return;
    }
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (config.days - 1));
    this.loadDashboard({
      preset,
      period: config.period,
      startDate: this.formatDateInput(start),
      endDate: this.formatDateInput(today),
    });
  }

  onPeriodChange(period: DashboardPeriod): void {
    this.loadDashboard({ period });
  }

  onCustomDateChange(field: 'startDate' | 'endDate', value: string): void {
    this.filters.update((current) => ({
      ...current,
      [field]: value || null,
      preset: 'custom',
    }));
  }

  applyCustomRange(): void {
    const { startDate, endDate } = this.filters();
    if (!startDate || !endDate) {
      this.errorMessage.set('Please select both a start and end date for the custom range.');
      return;
    }
    this.loadDashboard({ preset: 'custom' });
  }

  resetFilters(): void {
    this.applyPreset('last_30_days');
  }

  toggleFilters(): void {
    this.showFilters.update((visible) => !visible);
  }

  loadMasterData(): void {
    this.categoriesLoading.set(true);
    this.paymentMethodsLoading.set(true);
    this.shippingMethodsLoading.set(true);

    forkJoin({
      categories: this.categoryService
        .listCategories(true)
        .pipe(catchError(() => of({ items: [], total: 0, page: 1, pageSize: 100 }))),
      paymentMethods: this.paymentMethodService
        .listPaymentMethods(true)
        .pipe(catchError(() => of({ items: [], total: 0, page: 1, pageSize: 100 }))),
      shippingMethods: this.shippingMethodService
        .listShippingMethods(true)
        .pipe(catchError(() => of({ items: [], total: 0, page: 1, pageSize: 100 }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          this.categories.set(results.categories.items);
          this.paymentMethods.set(results.paymentMethods.items);
          this.shippingMethods.set(results.shippingMethods.items);
          this.categoriesLoading.set(false);
          this.paymentMethodsLoading.set(false);
          this.shippingMethodsLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load master data:', error);
          this.categoriesLoading.set(false);
          this.paymentMethodsLoading.set(false);
          this.shippingMethodsLoading.set(false);
        },
      });
  }

  getActiveCount(items: Array<{ isActive?: boolean }>): number {
    return items.filter((item) => item.isActive !== false).length;
  }

  private loadDashboard(partial?: Partial<DashboardFilters>): void {
    const nextFilters: DashboardFilters = {
      ...this.filters(),
      ...partial,
    };

    if (
      nextFilters.startDate &&
      nextFilters.endDate &&
      new Date(nextFilters.startDate) > new Date(nextFilters.endDate)
    ) {
      this.errorMessage.set('Start date cannot be after end date.');
      return;
    }

    this.filters.set(nextFilters);
    this.loading.set(true);
    this.errorMessage.set(null);

    this.reportsService
      .getDashboard(nextFilters.startDate ?? undefined, nextFilters.endDate ?? undefined, nextFilters.period)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.dashboard.set(data);
          this.lastUpdated.set(new Date());
        },
        error: (error) => this.handleDashboardError(error),
      });
  }

  private handleDashboardError(error: any): void {
    console.error('Failed to load dashboard:', error);
    if (error.status === 403) {
      this.errorMessage.set('Access denied. Admin privileges required to view dashboard.');
    } else if (error.status === 401) {
      this.errorMessage.set('Please log in to view dashboard.');
    } else {
      this.errorMessage.set(error.error?.detail || 'Failed to load dashboard data.');
    }
  }

  private formatDateInput(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }
}
