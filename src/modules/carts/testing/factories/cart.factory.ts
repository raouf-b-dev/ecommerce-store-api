// src/modules/carts/testing/factories/cart.factory.ts
import { Cart, CartProps } from '../../core/domain/entities/cart';

export class CartTestFactory {
  static createMockCart(overrides?: Partial<CartProps>): Cart {
    const cartProps: CartProps = {
      id: 123,
      userId: 123,
      items: [],
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
      ...overrides,
    };

    const cart = Cart.fromPrimitives(cartProps);
    return cart;
  }

  static createEmptyCart(overrides?: Partial<CartProps>): Cart {
    return this.createMockCart({
      items: [],
      ...overrides,
    });
  }

  static createCartWithItems(
    itemCount: number = 3,
    overrides?: Partial<CartProps>,
  ): Cart {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: i + 1,
      productId: i + 1,
      productName: `Product ${i + 1}`,
      price: 10 * (i + 1),
      quantity: 1,
      subtotal: 10 * (i + 1),
      imageUrl: `http://example.com/image-${i + 1}.jpg`,
    }));

    return this.createMockCart({
      items,
      ...overrides,
    });
  }

  static createUserCart(userId: number, overrides?: Partial<CartProps>): Cart {
    return this.createMockCart({
      userId: userId,
      ...overrides,
    });
  }
}
