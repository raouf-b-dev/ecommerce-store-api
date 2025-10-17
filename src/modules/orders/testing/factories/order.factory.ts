// src/modules/order/testing/factories/order.test.factory.ts
import { IOrder } from '../../domain/interfaces/order.interface';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethod } from '../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../domain/value-objects/payment-status';

export class OrderTestFactory {
  /**
   * Creates a complete mock order with all fields populated
   * Use this as your default mock for most tests
   */
  static createMockOrder(overrides?: Partial<IOrder>): IOrder {
    const baseOrder: IOrder = {
      // Basic identifiers
      id: 'OR0001',
      customerId: 'CUST1',
      paymentInfoId: 'PAY001',
      shippingAddressId: 'ADDR001',

      // Order items
      items: [
        {
          id: 'item-1',
          productId: 'PR1',
          productName: 'P1',
          quantity: 1,
          unitPrice: 10,
          lineTotal: 10,
        },
      ],

      // Customer information
      customerInfo: {
        customerId: 'CUST1',
        email: 'customer@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
      },

      // Payment information - defaults to CREDIT_CARD with PENDING status
      paymentInfo: {
        id: 'PAY001',
        method: PaymentMethod.CREDIT_CARD,
        amount: 15,
        status: PaymentStatus.PENDING,
        transactionId: 'TXN123456',
        notes: 'Awaiting payment confirmation',
      },

      // Shipping address
      shippingAddress: {
        id: 'ADDR001',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'dz',
        phone: '+1234567890',
      },

      // Pricing
      subtotal: 10,
      shippingCost: 0,
      totalPrice: 10,

      // Order status and timestamps
      status: OrderStatus.PENDING,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),

      // Optional customer notes
      customerNotes: 'Please ring doorbell upon delivery',
    };

    return { ...baseOrder, ...overrides };
  }

  /**
   * Creates domain-specific order states for testing business logic
   */
  static createPendingOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        status: PaymentStatus.PENDING,
      },
      ...overrides,
    });
  }

  static createConfirmedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.CONFIRMED,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-01-01T10:30:00Z'),
      },
      ...overrides,
    });
  }

  static createProcessingOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PROCESSING,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-01-01T10:30:00Z'),
      },
      ...overrides,
    });
  }

  static createShippedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.SHIPPED,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-01-01T10:30:00Z'),
      },
      ...overrides,
    });
  }

  static createDeliveredOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.DELIVERED,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-01-01T11:00:00Z'),
      },
      ...overrides,
    });
  }

  static createCancelledOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.CANCELLED,
      customerNotes: 'Order cancelled by customer',
      ...overrides,
    });
  }

  /**
   * IMPORTANT: Cancellable orders are PENDING, CONFIRMED, PROCESSING, or SHIPPED
   * Default: PENDING for easy testing
   */
  static createCancellableOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createPendingOrder(overrides);
  }

  /**
   * IMPORTANT: Non-cancellable orders are DELIVERED or CANCELLED
   * Default: DELIVERED (final state)
   */
  static createNonCancellableOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createDeliveredOrder(overrides);
  }

  /**
   * Creates an order with specific payment method
   */
  static createCashOnDeliveryOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        method: PaymentMethod.CASH_ON_DELIVERY,
        status: PaymentStatus.NOT_REQUIRED_YET, // Important!
        transactionId: undefined,
        paidAt: undefined,
        notes: 'Payment on delivery',
      },
      ...overrides,
    });
  }

  static createStripeOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
      },
      ...overrides,
    });
  }

  static createPayPalOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        method: PaymentMethod.PAYPAL,
        status: PaymentStatus.PENDING,
      },
      ...overrides,
    });
  }

  /**
   * Creates an order with multiple items
   */
  static createMultiItemOrder(itemCount: number = 3): IOrder {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: `item-${i + 1}`,
      productId: `PR${i + 1}`,
      productName: `Product ${i + 1}`,
      quantity: i + 1,
      unitPrice: 10 * (i + 1),
      lineTotal: 10 * (i + 1) * (i + 1),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalPrice = subtotal + 5; // + shipping

    return this.createMockOrder({
      items,
      subtotal,
      shippingCost: 5,
      totalPrice,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        amount: totalPrice,
      },
    });
  }

  /**
   * Helper: Creates COD order ready for confirmation
   */
  static createCODOrderReadyForConfirmation(): IOrder {
    return this.createCashOnDeliveryOrder({
      status: OrderStatus.PENDING,
      paymentInfo: {
        id: 'PAY001',
        method: PaymentMethod.CASH_ON_DELIVERY,
        status: PaymentStatus.NOT_REQUIRED_YET,
        amount: 15,
        notes: 'Payment on delivery',
      },
    });
  }

  /**
   * Helper: Creates online payment order ready for confirmation (payment completed)
   */
  static createOnlineOrderReadyForConfirmation(): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        transactionId: 'stripe_pi_123456',
      },
    });
  }

  /**
   * Helper: Creates online payment order NOT ready for confirmation (payment pending)
   */
  static createOnlineOrderNotReadyForConfirmation(): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING,
      paymentInfo: {
        ...this.createMockOrder().paymentInfo,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        transactionId: undefined,
        paidAt: undefined,
      },
    });
  }
}
