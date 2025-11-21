import { createActionGroup, props } from '@ngrx/store';

import type { Order, CreateOrderRequest } from '../../shared/models/order';

export const OrdersActions = createActionGroup({
  source: 'Orders',
  events: {
    'Load Orders': props<{ customerId?: string }>(),
    'Load Orders Success': props<{ orders: Order[] }>(),
    'Load Orders Failure': props<{ error: string }>(),
    'Create Order': props<{ payload: CreateOrderRequest }>(),
    'Create Order Success': props<{ order: Order }>(),
    'Create Order Failure': props<{ error: string }>(),
  },
});


