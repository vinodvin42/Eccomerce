import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { Product, ProductListResponse } from '../../shared/models/catalog';
import type { ProductCreateRequest } from '../../shared/models/catalog';

export const CatalogActions = createActionGroup({
  source: 'Catalog',
  events: {
    'Load Products': props<{ search?: string }>(),
    'Load Products Success': props<{ response: ProductListResponse }>(),
    'Load Products Failure': props<{ error: string }>(),

    'Create Product': props<{ payload: ProductCreateRequest }>(),
    'Create Product Success': props<{ product: Product }>(),
    'Create Product Failure': props<{ error: string }>(),
    'Reset Catalog Error': emptyProps(),
  },
});


