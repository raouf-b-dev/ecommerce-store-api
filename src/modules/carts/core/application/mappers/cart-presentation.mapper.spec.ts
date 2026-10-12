import { CartTestFactory } from 'src/modules/carts/testing';
import { CartPresentationMapper } from './cart-presentation.mapper';

describe('CartPresentationMapper', () => {
  it('maps empty cart with subtotal and shippingCost for API responses', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 7, userId: 3 });
    cart.setId(7);

    const dto = CartPresentationMapper.fromDomain(cart);

    expect(dto.subtotal).toBe(0);
    expect(dto.shippingCost).toBe(0);
    expect(dto.totalAmount).toBe(0);
    expect(dto.items).toEqual([]);
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

    const dto = CartPresentationMapper.fromDomain(cart);

    expect(dto.subtotal).toBe(65);
    expect(dto.shippingCost).toBe(0);
    expect(dto.totalAmount).toBe(65);
    expect(dto.items).toEqual([
      {
        id: null,
        productId: 10,
        productName: 'T-Shirt',
        price: 32.5,
        currency: 'USD',
        quantity: 2,
        subtotal: 65,
        imageUrl: 'https://example.com/shirt.jpg',
      },
    ]);
  });

  it('maps zero-decimal JPY amounts correctly (1000 JPY)', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 8, userId: 3 });
    cart.setId(8);
    cart.addItem(11, 'Matcha', 1000, 1, 'JPY');

    const dto = CartPresentationMapper.fromDomain(cart);

    expect(dto.subtotal).toBe(1000);
    expect(dto.totalAmount).toBe(1000);
    expect(dto.currency).toBe('JPY');
    expect(dto.items[0].price).toBe(1000);
    expect(dto.items[0].subtotal).toBe(1000);
  });

  it('maps three-decimal KWD amounts correctly (1.234 KWD)', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 9, userId: 3 });
    cart.setId(9);
    cart.addItem(12, 'Perfume', 1234, 1, 'KWD');

    const dto = CartPresentationMapper.fromDomain(cart);

    expect(dto.subtotal).toBe(1.234);
    expect(dto.totalAmount).toBe(1.234);
    expect(dto.currency).toBe('KWD');
    expect(dto.items[0].price).toBe(1.234);
    expect(dto.items[0].subtotal).toBe(1.234);
  });
});
