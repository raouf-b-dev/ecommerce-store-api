import { OrderPricing } from './order-pricing';
import { OrderItem } from '../entities/order-items';

describe('OrderPricing', () => {
  const createItem = (
    unitPrice: number,
    quantity: number,
    productId = 1,
  ): OrderItem =>
    OrderItem.fromProps({
      id: null,
      productId,
      productName: `Product ${productId}`,
      unitPrice,
      quantity,
    });

  describe('calculate', () => {
    it('sums line totals into subtotal and total', () => {
      const items = [createItem(10, 2, 1), createItem(25, 1, 2)];

      const pricing = OrderPricing.calculate(items);

      expect(pricing.subtotal).toBe(45);
      expect(pricing.shippingCost).toBe(0);
      expect(pricing.totalPrice).toBe(45);
    });

    it('handles single-item orders', () => {
      const pricing = OrderPricing.calculate([createItem(99.99, 1)]);

      expect(pricing.subtotal).toBe(99.99);
      expect(pricing.totalPrice).toBe(99.99);
    });
  });

  describe('recalculate', () => {
    it('produces same result as calculate for updated items', () => {
      const initial = OrderPricing.calculate([createItem(10, 1)]);
      const updatedItems = [createItem(10, 1), createItem(5, 2)];
      const recalculated = OrderPricing.recalculate(updatedItems);

      expect(recalculated.subtotal).toBe(20);
      expect(recalculated.equals(OrderPricing.calculate(updatedItems))).toBe(
        true,
      );
      expect(recalculated.subtotal).not.toBe(initial.subtotal);
    });
  });

  describe('toPrimitives and equals', () => {
    it('round-trips numeric breakdown', () => {
      const pricing = OrderPricing.calculate([createItem(12.5, 2)]);

      expect(pricing.toPrimitives()).toEqual({
        subtotal: 25,
        shippingCost: 0,
        totalPrice: 25,
      });
    });

    it('equals compares all money components', () => {
      const a = OrderPricing.calculate([createItem(10, 1)]);
      const b = OrderPricing.calculate([createItem(10, 1)]);
      const c = OrderPricing.calculate([createItem(20, 1)]);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });
  });
});
