// src/modules/orders/testing/factories/order-entity.test.factory.ts
import { OrderEntity } from '../../infrastructure/orm/order.schema';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethod } from '../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../domain/value-objects/payment-status';
import { CustomerInfoEntity } from '../../infrastructure/orm/customer-info.schema';
import { OrderItemEntity } from '../../infrastructure/orm/order-item.schema';
import { PaymentInfoEntity } from '../../infrastructure/orm/payment-info.schema';
import { ShippingAddressEntity } from '../../infrastructure/orm/shipping-address.schema';

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
      paymentInfoId: 'PAY0000001',
      shippingAddressId: 'ADDR0000001',

      customerInfo: this.createCustomerInfoEntity(),
      paymentInfo: this.createPaymentInfoEntity(),
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
   * Creates CustomerInfoEntity
   */
  static createCustomerInfoEntity(
    overrides?: Partial<CustomerInfoEntity>,
  ): CustomerInfoEntity {
    const defaultEntity: CustomerInfoEntity = {
      customerId: 'CUST0000001',
      email: 'customer@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
    };

    return { ...defaultEntity, ...overrides };
  }

  /**
   * Creates PaymentInfoEntity
   */
  static createPaymentInfoEntity(
    overrides?: Partial<PaymentInfoEntity>,
  ): PaymentInfoEntity {
    const defaultEntity: PaymentInfoEntity = {
      id: 'PAY0000001',
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
      amount: 100,
      transactionId: 'TXN123456',
      paidAt: undefined,
      notes: 'Payment pending',
    };

    return { ...defaultEntity, ...overrides };
  }

  /**
   * Creates PaymentInfoEntity for COD orders
   */
  static createCODPaymentInfoEntity(
    overrides?: Partial<PaymentInfoEntity>,
  ): PaymentInfoEntity {
    return this.createPaymentInfoEntity({
      method: PaymentMethod.CASH_ON_DELIVERY,
      status: PaymentStatus.NOT_REQUIRED_YET,
      transactionId: undefined,
      paidAt: undefined,
      notes: 'Payment on delivery',
      ...overrides,
    });
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
      paymentInfo: this.createCODPaymentInfoEntity(),
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
    const paymentCompleted = ![
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
    ].includes(status);

    return this.createOrderEntity({
      status,
      paymentInfo: this.createPaymentInfoEntity({
        status: paymentCompleted
          ? PaymentStatus.COMPLETED
          : PaymentStatus.PENDING,
        paidAt: paymentCompleted ? new Date() : undefined,
      }),
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
      paymentInfo: this.createPaymentInfoEntity({ amount: totalPrice }),
    });
  }
}
