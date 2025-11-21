import { createReducer, on } from '@ngrx/store';

import { CatalogActions } from './catalog.actions';
import type { Product } from '../../shared/models/catalog';

export interface CatalogState {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  creating: boolean;
  error?: string;
}

const initialState: CatalogState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  creating: false,
};

export const catalogReducer = createReducer(
  initialState,
  on(CatalogActions.loadProducts, (state, { search }) => ({
    ...state,
    loading: true,
    error: undefined,
  })),
  on(CatalogActions.loadProductsSuccess, (state, { response }) => ({
    ...state,
    items: response.items,
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
    loading: false,
  })),
  on(CatalogActions.loadProductsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(CatalogActions.createProduct, (state) => ({
    ...state,
    creating: true,
    error: undefined,
  })),
  on(CatalogActions.createProductSuccess, (state, { product }) => ({
    ...state,
    creating: false,
    items: [product, ...state.items],
    total: state.total + 1,
  })),
  on(CatalogActions.createProductFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),
  on(CatalogActions.resetCatalogError, (state) => ({
    ...state,
    error: undefined,
  })),
);


