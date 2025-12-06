// src/modules/order/testing/factories/order.test.factory.ts
import { IOrder } from '../../domain/interfaces/order.interface';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethodType } from '../../../payments/domain';

export class OrderTestFactory {
  static createMockOrder(overrides?: Partial<IOrder>): IOrder {
    const baseOrder: IOrder = {
      // Basic identifiers
      id: 'OR0001',
      customerId: 'CUST1',
      paymentId: null,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
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

  static createPendingOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING,
      ...overrides,
    });
  }

  static createConfirmedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.CONFIRMED,
      paymentId: 'PAY001',
      ...overrides,
    });
  }

  static createProcessingOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PROCESSING,
      paymentId: 'PAY001',
      ...overrides,
    });
  }

  static createShippedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.SHIPPED,
      paymentId: 'PAY001',
      ...overrides,
    });
  }

  static createDeliveredOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.DELIVERED,
      paymentId: 'PAY001',
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

  static createCancellableOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createPendingOrder(overrides);
  }

  static createNonCancellableOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createDeliveredOrder(overrides);
  }

  static createCashOnDeliveryOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      paymentId: null, // No payment until delivery
      ...overrides,
    });
  }

  static createStripeOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: 'PAY_STRIPE_001',
      ...overrides,
    });
  }

  static createPayPalOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentMethod: PaymentMethodType.PAYPAL,
      paymentId: 'PAY_PAYPAL_001',
      ...overrides,
    });
  }

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
    });
  }

  static createCODOrderReadyForConfirmation(): IOrder {
    return this.createCashOnDeliveryOrder({
      status: OrderStatus.PENDING,
    });
  }

  static createOnlineOrderReadyForConfirmation(): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: 'PAY_STRIPE_001', // Has payment
    });
  }

  static createOnlineOrderNotReadyForConfirmation(): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: null, // No payment yet
    });
  }

  // Additional helper for orders with payment
  static createOrderWithPayment(
    paymentId: string,
    paymentMethod: PaymentMethodType = PaymentMethodType.CREDIT_CARD,
    overrides?: Partial<IOrder>,
  ): IOrder {
    return this.createMockOrder({
      paymentId,
      paymentMethod,
      ...overrides,
    });
  }
}
