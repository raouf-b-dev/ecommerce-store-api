// src/modules/carts/testing/builders/cart.builder.ts
import { ICart } from '../../core/domain/interfaces/cart.interface';
import { CartTestFactory } from '../factories/cart.factory';

export class CartBuilder {
  private cart: ICart;

  constructor() {
    this.cart = CartTestFactory.createMockCart();
  }

  withId(id: number): this {
    this.cart.id = id;
    return this;
  }

  withCustomerId(customerId: number): this {
    this.cart.customerId = customerId;
    this.cart.sessionId = null;
    return this;
  }

  withSessionId(sessionId: number): this {
    this.cart.sessionId = sessionId;
    this.cart.customerId = null;
    return this;
  }

  withItems(count: number): this {
    const items = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      productId: i + 1,
      productName: `Product ${i + 1}`,
      price: 10 * (i + 1),
      quantity: 1,
      subtotal: 10 * (i + 1),
      imageUrl: `http://example.com/image-${i + 1}.jpg`,
    }));

    this.cart.items = items;
    this.recalculateTotals();
    return this;
  }

  withCreatedAt(date: Date): this {
    this.cart.createdAt = date;
    return this;
  }

  withUpdatedAt(date: Date): this {
    this.cart.updatedAt = date;
    return this;
  }

  private recalculateTotals(): void {
    this.cart.itemCount = this.cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    this.cart.totalAmount = this.cart.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
  }

  build(): ICart {
    return { ...this.cart };
  }
}
