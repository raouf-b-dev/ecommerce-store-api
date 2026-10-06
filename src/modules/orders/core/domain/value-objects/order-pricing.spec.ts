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
      currency: 'USD',
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
      const pricing = OrderPricing.calculate([createItem(9999, 1)]);

      expect(pricing.subtotal).toBe(9999);
      expect(pricing.totalPrice).toBe(9999);
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
      const pricing = OrderPricing.calculate([createItem(1250, 2)]);

      expect(pricing.toPrimitives()).toEqual({
        subtotal: 2500,
        shippingCost: 0,
        totalPrice: 2500,
      });
    });

    it('equals compares all money components', () => {
      const a = OrderPricing.calculate([createItem(10, 1)]);
      const b = OrderPricing.calculate([createItem(10, 1)]);
      const c = OrderPricing.calculate([createItem(20, 1)]);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('rejects mixed line currencies', () => {
      const usd = OrderItem.fromProps({
        id: null,
        productId: 1,
        productName: 'USD item',
        unitPrice: 10,
        quantity: 1,
        currency: 'USD',
      });
      const eur = OrderItem.fromProps({
        id: null,
        productId: 2,
        productName: 'EUR item',
        unitPrice: 10,
        quantity: 1,
        currency: 'EUR',
      });

      expect(() => OrderPricing.calculate([usd, eur])).toThrow(
        /different currencies/,
      );
    });
  });
});
