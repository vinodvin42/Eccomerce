import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { CartState } from './cart.reducer';

export const selectCartState = createFeatureSelector<CartState>('cart');

export const selectCartItems = createSelector(selectCartState, (state) => state.items);

export const selectCartItemCount = createSelector(selectCartItems, (items) =>
  items.reduce((total, item) => total + item.quantity, 0)
);

export const selectCartTotal = createSelector(selectCartItems, (items) =>
  items.reduce((total, item) => total + item.price.amount, 0)
);

export const selectCartItemByProductId = (productId: string) =>
  createSelector(selectCartItems, (items) => items.find((item) => item.productId === productId));

