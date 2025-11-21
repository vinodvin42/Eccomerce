import { createFeatureSelector, createSelector } from '@ngrx/store';

import { OrdersState } from './orders.reducer';

export const selectOrdersState = createFeatureSelector<OrdersState>('orders');

export const selectLastOrder = createSelector(selectOrdersState, (state) => state.lastOrder);

export const selectOrdersList = createSelector(selectOrdersState, (state) => state.orders);

export const selectOrdersLoading = createSelector(selectOrdersState, (state) => state.loading);

export const selectOrderCreating = createSelector(selectOrdersState, (state) => state.creating);

export const selectOrderError = createSelector(selectOrdersState, (state) => state.error);


