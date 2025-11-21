import type { Product } from '../../shared/models/catalog';

export interface PriceBreakdown {
  metalValue: number;
  wastageValue: number;
  makingCharges: number;
  stoneCharges: number;
  subtotal: number;
  gstAmount: number;
  finalPrice: number;
  currency: string;
}

/**
 * Calculate the final price of a product based on all pricing fields
 */
export function calculateProductPrice(product: Product, quantity: number = 1): PriceBreakdown {
  const currency = product.price.currency || 'INR';
  
  // Base metal value - use metalValue if available, otherwise use price.amount
  const metalValue = (product.metalValue || product.price.amount || 0) * quantity;
  
  // Wastage value - use wastageValue if available, otherwise calculate from wastage %
  let wastageValue = (product.wastageValue || 0) * quantity;
  if (!product.wastageValue && product.wastagePercent && metalValue > 0) {
    wastageValue = (metalValue * product.wastagePercent) / 100;
  }
  
  // Making charges
  const makingCharges = (product.makingCharges || 0) * quantity;
  
  // Stone charges
  const stoneCharges = (product.stoneCharges || 0) * quantity;
  
  // Subtotal before GST
  const subtotal = metalValue + wastageValue + makingCharges + stoneCharges;
  
  // GST amount
  let gstAmount = 0;
  if (product.gstPercent && subtotal > 0) {
    gstAmount = (subtotal * product.gstPercent) / 100;
  }
  
  // Final price
  const finalPrice = subtotal + gstAmount;
  
  return {
    metalValue,
    wastageValue,
    makingCharges,
    stoneCharges,
    subtotal,
    gstAmount,
    finalPrice,
    currency,
  };
}

