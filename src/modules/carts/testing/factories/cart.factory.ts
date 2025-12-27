// src/modules/carts/testing/factories/cart.factory.ts
import { ICart } from '../../domain/interfaces/cart.interface';

export class CartTestFactory {
  static createMockCart(overrides?: Partial<ICart>): ICart {
    const baseCart: ICart = {
      id: 123,
      customerId: 123,
      sessionId: null,
      items: [],
      itemCount: 0,
      totalAmount: 0,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...baseCart, ...overrides };
  }

  static createEmptyCart(overrides?: Partial<ICart>): ICart {
    return this.createMockCart({
      items: [],
      itemCount: 0,
      totalAmount: 0,
      ...overrides,
    });
  }

  static createCartWithItems(
    itemCount: number = 3,
    overrides?: Partial<ICart>,
  ): ICart {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: i + 1,
      productId: i + 1,
      productName: `Product ${i + 1}`,
      price: 10 * (i + 1),
      quantity: 1,
      subtotal: 10 * (i + 1),
      imageUrl: `http://example.com/image-${i + 1}.jpg`,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    return this.createMockCart({
      items,
      itemCount,
      totalAmount,
      ...overrides,
    });
  }

  static createGuestCart(sessionId: number, overrides?: Partial<ICart>): ICart {
    return this.createMockCart({
      customerId: null,
      sessionId,
      ...overrides,
    });
  }

  static createUserCart(customerId: number, overrides?: Partial<ICart>): ICart {
    return this.createMockCart({
      customerId,
      sessionId: null,
      ...overrides,
    });
  }
}
