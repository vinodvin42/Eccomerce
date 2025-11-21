import { ActionReducerMap } from '@ngrx/store';

import { cartReducer, CartState } from './cart/cart.reducer';
import { catalogReducer, CatalogState } from './catalog/catalog.reducer';
import { ordersReducer, OrdersState } from './orders/orders.reducer';

export interface AppState {
  catalog: CatalogState;
  orders: OrdersState;
  cart: CartState;
}

export const reducers: ActionReducerMap<AppState> = {
  catalog: catalogReducer,
  orders: ordersReducer,
  cart: cartReducer,
};


