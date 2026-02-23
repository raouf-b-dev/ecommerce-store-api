// src/modules/carts/testing/factories/cart-entity.factory.ts
import { CartItemEntity } from '../../secondary-adapters/orm/cart-item.schema';
import { CartEntity } from '../../secondary-adapters/orm/cart.schema';

export class CartEntityTestFactory {
  static createCartEntity(overrides?: Partial<CartEntity>): CartEntity {
    const defaultEntity: CartEntity = {
      id: 123,
      customerId: 123,
      sessionId: null,
      items: [],
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...defaultEntity, ...overrides };
  }

  static createCartItemEntity(
    overrides?: Partial<CartItemEntity>,
  ): CartItemEntity {
    const defaultEntity: CartItemEntity = {
      id: 123,
      productId: 123,
      productName: 'Test Product',
      price: 100,
      quantity: 1,
      imageUrl: 'http://example.com/image.jpg',
      cart: null as any,
    };

    return { ...defaultEntity, ...overrides };
  }

  static createCartEntityWithItems(itemCount: number = 3): CartEntity {
    const items = Array.from({ length: itemCount }, (_, i) =>
      this.createCartItemEntity({
        id: i + 1,
        productId: i + 1,
        productName: `Product ${i + 1}`,
        price: 10 * (i + 1),
        quantity: 1,
      }),
    );

    const cart = this.createCartEntity({ items });
    items.forEach((item) => (item.cart = cart));

    return cart;
  }
}
