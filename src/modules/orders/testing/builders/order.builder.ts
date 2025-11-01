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

    if (method === PaymentMethod.CASH_ON_DELIVERY) {
      this.order.paymentInfo.status = PaymentStatus.NOT_REQUIRED_YET;
      this.order.paymentInfo.transactionId = null;
      this.order.paymentInfo.paidAt = null;
      this.order.paymentInfo.notes = 'Payment on delivery';
    } else {
      this.order.paymentInfo.status = PaymentStatus.PENDING;
    }

    return this;
  }

  withPaymentStatus(status: PaymentStatus): this {
    this.order.paymentInfo.status = status;

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

  asCancellable(): this {
    return this.withStatus(OrderStatus.PENDING).withPaymentStatus(
      PaymentStatus.PENDING,
    );
  }

  asNonCancellable(): this {
    return this.withStatus(OrderStatus.DELIVERED).withPaymentStatus(
      PaymentStatus.COMPLETED,
    );
  }

  asCODPending(): this {
    return this.withPaymentMethod(PaymentMethod.CASH_ON_DELIVERY)
      .withStatus(OrderStatus.PENDING)
      .withPaymentStatus(PaymentStatus.NOT_REQUIRED_YET);
  }

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
