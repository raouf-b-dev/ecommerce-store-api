import { CartTestFactory } from 'src/modules/carts/testing';
import { CartPresentationMapper } from './cart-presentation.mapper';
import { ResultAssertionHelper } from '../../../../../testing';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';

describe('CartPresentationMapper', () => {
  it('maps empty cart with subtotal and shippingCost for API responses', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 7, userId: 3 });
    cart.setId(7);

    const result = CartPresentationMapper.fromDomain(cart);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.subtotal).toBe(0);
    expect(result.value.shippingCost).toBe(0);
    expect(result.value.totalAmount).toBe(0);
    expect(result.value.items).toEqual([]);
  });

  it('maps items and converts minor units to major-unit decimals (USD)', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 7, userId: 3 });
    cart.setId(7);
    cart.addItem(
      10,
      'T-Shirt',
      3250,
      2,
      'USD',
      'https://example.com/shirt.jpg',
    );

    const result = CartPresentationMapper.fromDomain(cart);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.subtotal).toBe(65);
    expect(result.value.shippingCost).toBe(0);
    expect(result.value.totalAmount).toBe(65);
    expect(result.value.items).toEqual([
      {
        id: null,
        productId: 10,
        productName: 'T-Shirt',
        price: 32.5,
        currency: 'USD',
        quantity: 2,
        subtotal: 65,
        imageUrl: 'https://example.com/shirt.jpg',
        sku: null,
      },
    ]);
  });

  it('maps zero-decimal JPY amounts correctly (1000 JPY)', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 8, userId: 3 });
    cart.setId(8);
    cart.addItem(11, 'Matcha', 1000, 1, 'JPY');

    const result = CartPresentationMapper.fromDomain(cart);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.subtotal).toBe(1000);
    expect(result.value.totalAmount).toBe(1000);
    expect(result.value.currency).toBe('JPY');
    expect(result.value.items[0].price).toBe(1000);
    expect(result.value.items[0].subtotal).toBe(1000);
  });

  it('maps three-decimal KWD amounts correctly (1.234 KWD)', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 9, userId: 3 });
    cart.setId(9);
    cart.addItem(12, 'Perfume', 1234, 1, 'KWD');

    const result = CartPresentationMapper.fromDomain(cart);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.subtotal).toBe(1.234);
    expect(result.value.totalAmount).toBe(1.234);
    expect(result.value.currency).toBe('KWD');
    expect(result.value.items[0].price).toBe(1.234);
    expect(result.value.items[0].subtotal).toBe(1.234);
  });

  it('returns a failure when line items use different currencies', () => {
    const cart = CartTestFactory.createMockCart({
      id: 10,
      userId: 3,
      items: [
        {
          id: 1,
          productId: 10,
          productName: 'Shirt',
          price: 3250,
          currency: 'USD',
          quantity: 1,
          imageUrl: null,
          sku: null,
        },
        {
          id: 2,
          productId: 11,
          productName: 'Matcha',
          price: 1000,
          currency: 'JPY',
          quantity: 1,
          imageUrl: null,
          sku: null,
        },
      ],
    });

    const result = CartPresentationMapper.fromDomain(cart);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Cannot combine amounts in different currencies: USD and JPY',
      DomainError,
    );
  });
});
