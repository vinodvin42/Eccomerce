import { createReducer, on } from '@ngrx/store';

import { CartActions, type CartItem } from './cart.actions';

export interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

export const cartReducer = createReducer(
  initialState,
  on(CartActions.addItem, (state, item) => {
    const existingItem = state.items.find((i) => i.productId === item.productId);
    if (existingItem) {
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        ),
      };
    }
    return {
      ...state,
      items: [...state.items, item],
    };
  }),
  on(CartActions.removeItem, (state, { productId }) => ({
    ...state,
    items: state.items.filter((item) => item.productId !== productId),
  })),
  on(CartActions.updateQuantity, (state, { productId, quantity }) => ({
    ...state,
    items: state.items.map((item) => {
      if (item.productId === productId) {
        // Recalculate price based on new quantity
        if (item.priceBreakdown) {
          const perUnit = item.priceBreakdown.finalPrice;
          const newFinalPrice = perUnit * quantity;
          return {
            ...item,
            quantity,
            price: {
              ...item.price,
              amount: newFinalPrice,
            },
          };
        }
        // If no breakdown, just multiply existing price by quantity ratio
        const quantityRatio = quantity / item.quantity;
        return {
          ...item,
          quantity,
          price: {
            ...item.price,
            amount: item.price.amount * quantityRatio,
          },
        };
      }
      return item;
    }),
  })),
  on(CartActions.clearCart, () => initialState)
);

