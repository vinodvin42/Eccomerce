import { Component, Input, computed, signal } from '@angular/core';
import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';

export interface SummaryItem {
  label: string;
  value: number | string;
  currency?: string;
  isTotal?: boolean;
}

@Component({
  selector: 'app-checkout-summary',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe, AsyncPipe],
  template: `
    <div class="summary-card">
      <h2>Order Summary</h2>
      <div class="summary-items">
        <div *ngFor="let item of displayItems()" [class.summary-total]="item.isTotal" class="summary-item">
          <span>{{ item.label }}</span>
          <strong *ngIf="isNumber(item.value)">
            {{ item.value | currency : (item.currency || 'INR') }}
          </strong>
          <strong *ngIf="!isNumber(item.value)">{{ item.value }}</strong>
        </div>
      </div>
      <div *ngIf="discountCode" class="discount-applied">
        <span>Discount Applied:</span>
        <strong>{{ discountCode }}</strong>
      </div>
      <div *ngIf="note" class="summary-note">
        <p>{{ note }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .summary-card {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        position: sticky;
        top: 1rem;
      }

      .summary-card h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        color: var(--premium-onyx);
      }

      .summary-items {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        font-size: 0.95rem;
      }

      .summary-item:not(.summary-total) {
        border-bottom: 1px solid var(--premium-silver);
      }

      .summary-item span {
        color: var(--premium-titanium);
      }

      .summary-item strong {
        color: var(--premium-onyx);
        font-weight: 600;
      }

      .summary-total {
        margin-top: 0.5rem;
        padding-top: 0.75rem;
        border-top: 2px solid var(--premium-gold);
        font-size: 1.125rem;
      }

      .summary-total span,
      .summary-total strong {
        color: var(--premium-onyx);
        font-weight: 700;
      }

      .discount-applied {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: rgba(16, 185, 129, 0.1);
        border-radius: 0.5rem;
        margin-top: 1rem;
        color: #10b981;
        font-size: 0.875rem;
      }

      .summary-note {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--premium-silver);
      }

      .summary-note p {
        margin: 0;
        color: var(--premium-titanium);
        font-size: 0.875rem;
        line-height: 1.5;
      }
    `,
  ],
})
export class CheckoutSummaryComponent {
  @Input() items: SummaryItem[] = [];
  @Input() discountCode?: string;
  @Input() note?: string;
  @Input() total?: number;
  @Input() totalCurrency: string = 'INR';

  totalItem = computed(() => {
    if (this.total !== undefined) {
      return { label: 'Total', value: this.total, currency: this.totalCurrency, isTotal: true };
    }
    // Calculate total from items if not provided
    const subtotal = this.items
      .filter(item => !item.isTotal)
      .reduce((sum, item) => sum + (typeof item.value === 'number' ? item.value : 0), 0);
    return { label: 'Total', value: subtotal, currency: this.totalCurrency || 'INR', isTotal: true };
  });

  displayItems = computed(() => {
    const regularItems = this.items.filter(item => !item.isTotal);
    return [...regularItems, this.totalItem()];
  });

  isNumber(value: number | string): value is number {
    return typeof value === 'number';
  }
}

