import { createFeatureSelector, createSelector } from '@ngrx/store';

import { CatalogState } from './catalog.reducer';

export const selectCatalogState = createFeatureSelector<CatalogState>('catalog');

export const selectCatalogItems = createSelector(
  selectCatalogState,
  (state) => state.items,
);

export const selectCatalogLoading = createSelector(
  selectCatalogState,
  (state) => state.loading,
);

export const selectCatalogCreating = createSelector(
  selectCatalogState,
  (state) => state.creating,
);

export const selectCatalogError = createSelector(
  selectCatalogState,
  (state) => state.error,
);

export const selectCatalogMeta = createSelector(selectCatalogState, (state) => ({
  total: state.total,
  page: state.page,
  pageSize: state.pageSize,
}));


