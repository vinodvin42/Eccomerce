import { createReducer, on } from '@ngrx/store';

import { OrdersActions } from './orders.actions';
import type { Order } from '../../shared/models/order';

export interface OrdersState {
  orders: Order[];
  lastOrder: Order | null;
  loading: boolean;
  creating: boolean;
  error?: string;
}

const initialState: OrdersState = {
  orders: [],
  lastOrder: null,
  loading: false,
  creating: false,
};

export const ordersReducer = createReducer(
  initialState,
  on(OrdersActions.loadOrders, (state) => ({
    ...state,
    loading: true,
    error: undefined,
  })),
  on(OrdersActions.loadOrdersSuccess, (state, { orders }) => ({
    ...state,
    orders,
    loading: false,
  })),
  on(OrdersActions.loadOrdersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(OrdersActions.createOrder, (state) => ({
    ...state,
    creating: true,
    error: undefined,
  })),
  on(OrdersActions.createOrderSuccess, (state, { order }) => ({
    ...state,
    creating: false,
    lastOrder: order,
    orders: [order, ...state.orders],
  })),
  on(OrdersActions.createOrderFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),
);


