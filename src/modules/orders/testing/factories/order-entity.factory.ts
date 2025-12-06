// src/modules/orders/testing/factories/order-entity.test.factory.ts
import { OrderEntity } from '../../infrastructure/orm/order.schema';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { OrderItemEntity } from '../../infrastructure/orm/order-item.schema';
import { ShippingAddressEntity } from '../../infrastructure/orm/shipping-address.schema';
import { PaymentMethodType } from '../../../payments/domain';

/**
 * Factory for creating ORM entity mocks for testing
 * Separate from domain test factories (OrderTestFactory)
 */
export class OrderEntityTestFactory {
  /**
   * Creates a complete OrderEntity with all relations
   */
  static createOrderEntity(overrides?: Partial<OrderEntity>): OrderEntity {
    const defaultEntity: OrderEntity = {
      id: 'OR0000001',
      customerId: 'CUST0000001',
      paymentId: null,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      shippingAddressId: 'ADDR0000001',

      shippingAddress: this.createShippingAddressEntity(),
      items: [this.createOrderItemEntity()],

      customerNotes: 'Test order notes',
      subtotal: 100,
      shippingCost: 0,
      totalPrice: 100,
      status: OrderStatus.PENDING,

      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...defaultEntity, ...overrides };
  }

  /**
   * Creates ShippingAddressEntity
   */
  static createShippingAddressEntity(
    overrides?: Partial<ShippingAddressEntity>,
  ): ShippingAddressEntity {
    const defaultEntity: ShippingAddressEntity = {
      id: 'ADDR0000001',
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'dz',
      phone: '+1234567890',
    };

    return { ...defaultEntity, ...overrides };
  }

  /**
   * Creates OrderItemEntity
   */
  static createOrderItemEntity(
    overrides?: Partial<OrderItemEntity>,
  ): OrderItemEntity {
    const defaultEntity: OrderItemEntity = {
      id: 'item-1',
      productId: 'PR3',
      productName: 'Test Product',
      unitPrice: 100,
      quantity: 1,
      lineTotal: 100,
      order: null as any,
      product: null as any,
    };

    return { ...defaultEntity, ...overrides };
  }

  /**
   * Creates multiple OrderItemEntities
   */
  static createOrderItemEntities(count: number): OrderItemEntity[] {
    return Array.from({ length: count }, (_, i) =>
      this.createOrderItemEntity({
        id: `item-${i + 1}`,
        productId: `PR${i + 1}`,
        productName: `Product ${i + 1}`,
        quantity: i + 1,
        unitPrice: 10 * (i + 1),
        lineTotal: 10 * (i + 1) * (i + 1),
      }),
    );
  }

  /**
   * Creates COD OrderEntity
   */
  static createCODOrderEntity(overrides?: Partial<OrderEntity>): OrderEntity {
    return this.createOrderEntity({
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      paymentId: null,
      ...overrides,
    });
  }

  /**
   * Creates OrderEntity with specific status
   */
  static createOrderEntityWithStatus(
    status: OrderStatus,
    overrides?: Partial<OrderEntity>,
  ): OrderEntity {
    const hasPayment = ![OrderStatus.PENDING, OrderStatus.CANCELLED].includes(
      status,
    );

    return this.createOrderEntity({
      status,
      paymentId: hasPayment ? 'PAY0000001' : null,
      ...overrides,
    });
  }

  /**
   * Creates cancelled OrderEntity
   */
  static createCancelledOrderEntity(
    overrides?: Partial<OrderEntity>,
  ): OrderEntity {
    return this.createOrderEntityWithStatus(OrderStatus.CANCELLED, overrides);
  }

  /**
   * Creates OrderEntity with multiple items
   */
  static createMultiItemOrderEntity(itemCount: number = 3): OrderEntity {
    const items = this.createOrderItemEntities(itemCount);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingCost = 5;
    const totalPrice = subtotal + shippingCost;

    return this.createOrderEntity({
      items,
      subtotal,
      shippingCost,
      totalPrice,
    });
  }

  /**
   * Creates OrderEntity with payment
   */
  static createOrderEntityWithPayment(
    paymentId: string,
    paymentMethod: PaymentMethodType = PaymentMethodType.CREDIT_CARD,
    overrides?: Partial<OrderEntity>,
  ): OrderEntity {
    return this.createOrderEntity({
      paymentId,
      paymentMethod,
      ...overrides,
    });
  }

  /**
   * Creates Stripe OrderEntity
   */
  static createStripeOrderEntity(
    overrides?: Partial<OrderEntity>,
  ): OrderEntity {
    return this.createOrderEntity({
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: 'PAY_STRIPE_001',
      ...overrides,
    });
  }

  /**
   * Creates PayPal OrderEntity
   */
  static createPayPalOrderEntity(
    overrides?: Partial<OrderEntity>,
  ): OrderEntity {
    return this.createOrderEntity({
      paymentMethod: PaymentMethodType.PAYPAL,
      paymentId: 'PAY_PAYPAL_001',
      ...overrides,
    });
  }
}
