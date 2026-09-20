import { CartDtoTestFactory } from 'src/modules/carts/testing';
import { CartQueryMapper } from './cart-query.mapper';

describe('CartQueryMapper', () => {
  it('should map raw query rows into a CartPresentationDTO', () => {
    const row1 = CartDtoTestFactory.createRawCartQueryRow({
      itemId: 100,
      price: '50.00',
      quantity: 2,
    });
    const row2 = CartDtoTestFactory.createRawCartQueryRow({
      itemId: 101,
      productId: 6,
      productName: 'Gaming Mouse',
      price: '30.00',
      quantity: 1,
    });

    const result = CartQueryMapper.toPresentationDto([row1, row2]);

    expect(result).toEqual({
      id: 1,
      userId: 10,
      items: [
        {
          id: 100,
          productId: 5,
          productName: 'Mechanical Keyboard',
          price: 50,
          currency: 'USD',
          quantity: 2,
          subtotal: 100,
          imageUrl: 'https://example.com/keyboard.jpg',
        },
        {
          id: 101,
          productId: 6,
          productName: 'Gaming Mouse',
          price: 30,
          currency: 'USD',
          quantity: 1,
          subtotal: 30,
          imageUrl: 'https://example.com/keyboard.jpg',
        },
      ],
      itemCount: 3,
      subtotal: 130,
      shippingCost: 0,
      totalAmount: 130,
      currency: 'USD',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('should return null if rows are empty', () => {
    expect(CartQueryMapper.toPresentationDto([])).toBeNull();
  });

  it('includes cart lines when itemId is 0 (legacy persisted rows)', () => {
    const row = CartDtoTestFactory.createRawCartQueryRow({
      itemId: 0,
      price: '12.50',
      quantity: 1,
    });

    const result = CartQueryMapper.toPresentationDto([row]);

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].id).toBe(0);
    expect(result?.subtotal).toBe(12.5);
  });
});
