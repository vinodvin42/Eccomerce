import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

import { CatalogActions } from './catalog.actions';
import { CatalogService } from '../../core/services/catalog.service';

@Injectable()
export class CatalogEffects {
  private readonly actions$ = inject(Actions);
  private readonly catalogService = inject(CatalogService);

  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CatalogActions.loadProducts),
      switchMap(({ search }) =>
        this.catalogService.listProducts(1, 20, search).pipe(
          map((response) => CatalogActions.loadProductsSuccess({ response })),
          catchError((error) =>
            of(CatalogActions.loadProductsFailure({ error: error.message ?? 'Failed to load products' })),
          ),
        ),
      ),
    ),
  );

  createProduct$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CatalogActions.createProduct),
      switchMap(({ payload }) =>
        this.catalogService.createProduct(payload).pipe(
          map((product) => CatalogActions.createProductSuccess({ product })),
          catchError((error) =>
            of(CatalogActions.createProductFailure({ error: error.message ?? 'Failed to create product' })),
          ),
        ),
      ),
    ),
  );
}


