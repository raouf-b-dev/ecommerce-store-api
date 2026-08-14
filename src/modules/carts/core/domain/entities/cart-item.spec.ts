import { CartItem } from './cart-item';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('CartItem', () => {
  describe('construction', () => {
    it.each([
      [
        'missing productId',
        { productId: 0, productName: 'A', price: 1, quantity: 1 },
      ],
      [
        'empty product name',
        { productId: 1, productName: '  ', price: 1, quantity: 1 },
      ],
      [
        'negative price',
        { productId: 1, productName: 'A', price: -1, quantity: 1 },
      ],
      [
        'zero quantity',
        { productId: 1, productName: 'A', price: 1, quantity: 0 },
      ],
    ] as const)('rejects %s', (_label, props) => {
      expect(
        () =>
          new CartItem({
            id: null,
            imageUrl: null,
            ...props,
          }),
      ).toThrow(DomainError);
    });

    it('trims product name and rounds price', () => {
      const item = new CartItem({
        id: null,
        productId: 1,
        productName: '  Widget  ',
        price: 10.556,
        quantity: 2,
        imageUrl: null,
      });

      expect(item.productName).toBe('Widget');
      expect(item.price).toBe(10.56);
      expect(item.subtotal).toBe(21.12);
    });
  });

  describe('updateQuantity', () => {
    it('updates quantity when positive', () => {
      const item = CartItem.create(1, 'Widget', 10, 1);

      ResultAssertionHelper.assertResultSuccess(item.updateQuantity(3));

      expect(item.quantity).toBe(3);
      expect(item.subtotal).toBe(30);
    });

    it('rejects zero or negative quantity', () => {
      const item = CartItem.create(1, 'Widget', 10, 2);

      ResultAssertionHelper.assertResultFailure(
        item.updateQuantity(0),
        'Quantity must be greater than zero',
        DomainError,
      );
    });
  });

  describe('increaseQuantity and decreaseQuantity', () => {
    it('increases and decreases quantity within bounds', () => {
      const item = CartItem.create(1, 'Widget', 10, 2);

      ResultAssertionHelper.assertResultSuccess(item.increaseQuantity(2));
      expect(item.quantity).toBe(4);

      ResultAssertionHelper.assertResultSuccess(item.decreaseQuantity(1));
      expect(item.quantity).toBe(3);
    });

    it('rejects decrease that would zero out quantity', () => {
      const item = CartItem.create(1, 'Widget', 10, 1);

      ResultAssertionHelper.assertResultFailure(
        item.decreaseQuantity(1),
        'Quantity cannot be zero or negative',
        DomainError,
      );
    });
  });

  describe('updatePrice and updateProductInfo', () => {
    it('updates price and product metadata', () => {
      const item = CartItem.create(1, 'Old', 10, 1);

      ResultAssertionHelper.assertResultSuccess(item.updatePrice(12.5));
      ResultAssertionHelper.assertResultSuccess(
        item.updateProductInfo('New Name', 15, 'http://img.test/a.png'),
      );

      expect(item.productName).toBe('New Name');
      expect(item.price).toBe(15);
      expect(item.imageUrl).toBe('http://img.test/a.png');
    });
  });
});
