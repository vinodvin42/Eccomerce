import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

import { OrderService } from '../../core/services/order.service';
import { OrdersActions } from './orders.actions';

@Injectable()
export class OrdersEffects {
  loadOrders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.loadOrders),
      switchMap(({ customerId }) =>
        this.orderService.listOrders(1, 20, customerId).pipe(
          map((response) => OrdersActions.loadOrdersSuccess({ orders: response.items })),
          catchError((error) => of(OrdersActions.loadOrdersFailure({ error: error.message })))
        )
      )
    )
  );

  constructor(
    private readonly actions$: Actions,
    private readonly orderService: OrderService
  ) {}
}
