// src/modules/order/testing/factories/order.test.factory.ts
import { IOrder } from '../../domain/interfaces/order.interface';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethodType } from '../../../payments/domain';

export class OrderTestFactory {
  static createMockOrder(overrides?: Partial<IOrder>): IOrder {
    const baseOrder: IOrder = {
      // Basic identifiers
      id: 1,
      customerId: 1,
      paymentId: null,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      shippingAddressId: 1,
      currency: 'USD',
      // Order items
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Product 1',
          quantity: 1,
          unitPrice: 10,
          lineTotal: 10,
        },
      ],

      // Shipping address
      shippingAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main Street',
        street2: null,
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'dz',
        phone: '+1234567890',
        deliveryInstructions: null,
      },

      // Pricing
      subtotal: 10,
      shippingCost: 0,
      totalPrice: 10,

      // Order status and timestamps
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),

      // Optional customer notes
      customerNotes: 'Please ring doorbell upon delivery',
    };

    return { ...baseOrder, ...overrides };
  }

  static createPendingPaymentOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING_PAYMENT,
      ...overrides,
    });
  }

  static createPaymentFailedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PAYMENT_FAILED,
      ...overrides,
    });
  }

  static createConfirmedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.CONFIRMED,
      paymentId: 1,
      ...overrides,
    });
  }

  static createProcessingOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PROCESSING,
      paymentId: 1,
      ...overrides,
    });
  }

  static createShippedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.SHIPPED,
      paymentId: 1,
      ...overrides,
    });
  }

  static createDeliveredOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.DELIVERED,
      paymentId: 1,
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
    return this.createPendingPaymentOrder(overrides);
  }

  static createNonCancellableOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createDeliveredOrder(overrides);
  }

  static createCashOnDeliveryOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      paymentId: null, // No payment until delivery
      status: OrderStatus.PENDING_CONFIRMATION, // COD orders start as pending confirmation
      ...overrides,
    });
  }

  static createStripeOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: 1,
      ...overrides,
    });
  }

  static createPayPalOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentMethod: PaymentMethodType.PAYPAL,
      paymentId: 1,
      ...overrides,
    });
  }

  static createMultiItemOrder(itemCount: number = 3): IOrder {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: i + 1,
      productId: i + 1,
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
    // COD orders can be confirmed immediately - they start in PENDING_CONFIRMATION
    return this.createMockOrder({
      status: OrderStatus.PENDING_CONFIRMATION,
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      paymentId: null,
    });
  }

  static createOnlineOrderReadyForConfirmation(): IOrder {
    // Online orders ready for confirmation have completed payment
    return this.createMockOrder({
      status: OrderStatus.PENDING_PAYMENT,
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: 1, // Payment is complete - ready to confirm
    });
  }

  static createOnlineOrderNotReadyForConfirmation(): IOrder {
    // Online orders not ready for confirmation still have pending payment
    return this.createMockOrder({
      status: OrderStatus.PENDING_PAYMENT,
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: null, // No payment yet - cannot confirm
    });
  }

  static createRefundedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      status: OrderStatus.REFUNDED,
      paymentId: 1,
      ...overrides,
    });
  }

  // Additional helper for orders with payment
  static createOrderWithPayment(
    paymentId: number,
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
