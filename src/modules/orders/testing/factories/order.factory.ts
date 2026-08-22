// src/modules/order/testing/factories/order.test.factory.ts
import { IOrder } from '../../core/domain/interfaces/order.interface';
import { OrderStatus } from '../../core/domain/value-objects/order-status';
import { Order, OrderProps } from '../../core/domain/entities/order';
import { ShippingAddressProps } from '../../core/domain/value-objects/shipping-address';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export class OrderTestFactory {
  static createMockOrder(overrides?: Partial<IOrder>): IOrder {
    const baseOrder: IOrder = {
      // Basic identifiers
      id: 1,
      userId: 1,
      paymentId: null,
      paymentMethod: PaymentMethodType.STRIPE,
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
      shippingAddress: this.createShippingAddressProps(),

      // Pricing
      subtotal: 10,
      shippingCost: 0,
      totalPrice: 10,

      // Order status and timestamps
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),

      // Optional user notes
      userNotes: 'Please ring doorbell upon delivery',
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
      ...overrides,
    });
  }

  static createCompletedOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createDeliveredOrder(overrides);
  }

  static createStripeOrder(overrides?: Partial<IOrder>): IOrder {
    return this.createMockOrder({
      paymentMethod: PaymentMethodType.STRIPE,
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

  static createOnlineOrderReadyForConfirmation(): IOrder {
    return this.createMockOrder({
      status: OrderStatus.PENDING_PAYMENT,
      paymentMethod: PaymentMethodType.STRIPE,
      paymentId: 1,
    });
  }

  static createOrderWithPayment(
    paymentId: number,
    paymentMethod: PaymentMethodType = PaymentMethodType.STRIPE,
    overrides?: Partial<IOrder>,
  ): IOrder {
    return this.createMockOrder({
      paymentId,
      paymentMethod,
      ...overrides,
    });
  }

  static createShippingAddressProps(
    overrides?: Partial<ShippingAddressProps>,
  ): ShippingAddressProps {
    const base: ShippingAddressProps = {
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
    };

    return { ...base, ...overrides };
  }

  static createOrderProps(overrides?: Partial<OrderProps>): OrderProps {
    const baseProps: OrderProps = {
      id: 1,
      userId: 1,
      paymentId: null,
      paymentMethod: PaymentMethodType.STRIPE,
      shippingAddressId: 1,
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Product 1',
          quantity: 1,
          unitPrice: 10,
        },
      ],
      shippingAddress: this.createShippingAddressProps(),
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
      userNotes: 'Please ring doorbell upon delivery',
    };

    return { ...baseProps, ...overrides };
  }

  static createDomainOrder(overrides?: Partial<OrderProps>): Order {
    const props = this.createOrderProps(overrides);
    return Order.fromPrimitives(props);
  }
}
