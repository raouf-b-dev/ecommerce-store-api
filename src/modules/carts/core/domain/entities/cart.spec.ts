import { CartTestFactory } from 'src/modules/carts/testing';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('Cart', () => {
  describe('addItem', () => {
    describe('when product is not in cart', () => {
      it('appends a new line item', () => {
        const cart = CartTestFactory.createEmptyCart();

        ResultAssertionHelper.assertResultSuccess(
          cart.addItem(1, 'Product A', 10, 2),
        );

        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].productId).toBe(1);
        expect(cart.items[0].quantity).toBe(2);
      });
    });

    describe('when product already exists', () => {
      it('merges quantity into existing line', () => {
        const cart = CartTestFactory.createMockCart({
          items: [
            {
              id: 1,
              productId: 5,
              productName: 'Existing',
              price: 20,
              quantity: 1,
              imageUrl: null,
            },
          ],
        });

        ResultAssertionHelper.assertResultSuccess(
          cart.addItem(5, 'Existing', 20, 3),
        );

        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].quantity).toBe(4);
      });
    });
  });

  describe('updateItemQuantity', () => {
    it('updates quantity for existing product', () => {
      const cart = CartTestFactory.createCartWithItems(1);

      ResultAssertionHelper.assertResultSuccess(cart.updateItemQuantity(1, 5));

      expect(cart.findItem(1)?.quantity).toBe(5);
    });

    it('returns failure when product not found', () => {
      const cart = CartTestFactory.createEmptyCart();

      ResultAssertionHelper.assertResultFailure(
        cart.updateItemQuantity(999, 1),
        'Item with product ID 999 not found in cart',
        DomainError,
      );
    });
  });

  describe('removeItem', () => {
    it('removes item by product id', () => {
      const cart = CartTestFactory.createCartWithItems(2);

      ResultAssertionHelper.assertResultSuccess(cart.removeItem(1));

      expect(cart.hasItem(1)).toBe(false);
      expect(cart.items).toHaveLength(1);
    });
  });

  describe('aggregates', () => {
    it('computes itemCount and totalAmount', () => {
      const cart = CartTestFactory.createMockCart({
        items: [
          {
            id: 1,
            productId: 1,
            productName: 'A',
            price: 10,
            quantity: 2,
            imageUrl: null,
          },
          {
            id: 2,
            productId: 2,
            productName: 'B',
            price: 5.5,
            quantity: 1,
            imageUrl: null,
          },
        ],
      });

      expect(cart.itemCount).toBe(3);
      expect(cart.totalAmount).toBe(25.5);
    });

    it('clearItems empties the cart', () => {
      const cart = CartTestFactory.createCartWithItems(2);

      cart.clearItems();

      expect(cart.isEmpty()).toBe(true);
      expect(cart.itemCount).toBe(0);
    });
  });

  describe('createUserCart', () => {
    it('creates empty cart for user', () => {
      const cart = CartTestFactory.createUserCart(42);

      expect(cart.userId).toBe(42);
      expect(cart.isEmpty()).toBe(true);
    });
  });
});
