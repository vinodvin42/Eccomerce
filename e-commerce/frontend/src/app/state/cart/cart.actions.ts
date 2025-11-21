import { createAction, props } from '@ngrx/store';

import type { Money } from '../../shared/models/catalog';

export interface CartItem {
  productId: string;
  name: string;
  price: Money;
  quantity: number;
  imageUrl?: string;
  sku?: string;
  inventory?: number; // Store inventory when adding to cart
  // Price breakdown for display (per-unit values)
  priceBreakdown?: {
    metalValue: number; // per unit
    wastageValue: number; // per unit
    makingCharges: number; // per unit
    stoneCharges: number; // per unit
    subtotal: number; // per unit
    gstAmount: number; // per unit
    finalPrice: number; // per unit
  };
}

export const CartActions = {
  addItem: createAction('[Cart] Add Item', props<CartItem>()),
  removeItem: createAction('[Cart] Remove Item', props<{ productId: string }>()),
  updateQuantity: createAction(
    '[Cart] Update Quantity',
    props<{ productId: string; quantity: number }>()
  ),
  clearCart: createAction('[Cart] Clear Cart'),
};

