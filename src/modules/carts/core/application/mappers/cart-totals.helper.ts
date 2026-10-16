/**
 * MVP shipping policy: always 0 until a shipping engine ships.
 * Shared by domain presentation and SQL query cart mappers.
 */
export function cartTotalsFromSubtotal(subtotal: number): {
  shippingCost: number;
  totalAmount: number;
} {
  const shippingCost = 0;
  return {
    shippingCost,
    totalAmount: subtotal + shippingCost,
  };
}
