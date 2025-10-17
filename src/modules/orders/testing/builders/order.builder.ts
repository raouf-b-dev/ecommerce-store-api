// src/modules/order/testing/builders/order.test.builder.ts
import { IOrder } from '../../domain/interfaces/order.interface';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethod } from '../../domain/value-objects/payment-method';
import { PaymentStatus } from '../../domain/value-objects/payment-status';
import { OrderTestFactory } from '../factories/order.factory';

export class OrderBuilder {
  private order: IOrder;

  constructor() {
    this.order = OrderTestFactory.createMockOrder();
  }

  withId(id: string): this {
    this.order.id = id;
    return this;
  }

  withStatus(status: OrderStatus): this {
    this.order.status = status;
    return this;
  }

  withCustomerId(customerId: string): this {
    this.order.customerId = customerId;
    this.order.customerInfo.customerId = customerId;
    return this;
  }

  withPaymentMethod(method: PaymentMethod): this {
    this.order.paymentInfo.method = method;

    // Set appropriate initial payment status based on method
    if (method === PaymentMethod.CASH_ON_DELIVERY) {
      this.order.paymentInfo.status = PaymentStatus.NOT_REQUIRED_YET;
      this.order.paymentInfo.transactionId = undefined;
      this.order.paymentInfo.paidAt = undefined;
      this.order.paymentInfo.notes = 'Payment on delivery';
    } else {
      // Online payment methods start as PENDING
      this.order.paymentInfo.status = PaymentStatus.PENDING;
    }

    return this;
  }

  withPaymentStatus(status: PaymentStatus): this {
    this.order.paymentInfo.status = status;

    // Set paidAt if status is COMPLETED
    if (status === PaymentStatus.COMPLETED && !this.order.paymentInfo.paidAt) {
      this.order.paymentInfo.paidAt = new Date();
    }

    return this;
  }

  withItems(count: number): this {
    const items = Array.from({ length: count }, (_, i) => ({
      id: `item-${i + 1}`,
      productId: `PR${i + 1}`,
      productName: `Product ${i + 1}`,
      quantity: 1,
      unitPrice: 10,
      lineTotal: 10,
    }));

    this.order.items = items;
    this.recalculatePricing();
    return this;
  }

  withShippingCost(cost: number): this {
    this.order.shippingCost = cost;
    this.recalculatePricing();
    return this;
  }

  /**
   * Makes order cancellable (PENDING, CONFIRMED, PROCESSING, or SHIPPED)
   * Default: PENDING
   */
  asCancellable(): this {
    return this.withStatus(OrderStatus.PENDING).withPaymentStatus(
      PaymentStatus.PENDING,
    );
  }

  /**
   * Makes order non-cancellable (DELIVERED or CANCELLED)
   * Default: DELIVERED
   */
  asNonCancellable(): this {
    return this.withStatus(OrderStatus.DELIVERED).withPaymentStatus(
      PaymentStatus.COMPLETED,
    );
  }

  /**
   * Sets up COD order in pending state
   */
  asCODPending(): this {
    return this.withPaymentMethod(PaymentMethod.CASH_ON_DELIVERY)
      .withStatus(OrderStatus.PENDING)
      .withPaymentStatus(PaymentStatus.NOT_REQUIRED_YET);
  }

  /**
   * Sets up online payment order awaiting payment
   */
  asOnlinePaymentPending(): this {
    return this.withPaymentMethod(PaymentMethod.STRIPE)
      .withStatus(OrderStatus.PENDING)
      .withPaymentStatus(PaymentStatus.PENDING);
  }

  private recalculatePricing(): void {
    this.order.subtotal = this.order.items.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    this.order.totalPrice = this.order.subtotal + this.order.shippingCost;
    this.order.paymentInfo.amount = this.order.totalPrice;
  }

  build(): IOrder {
    return { ...this.order };
  }
}
