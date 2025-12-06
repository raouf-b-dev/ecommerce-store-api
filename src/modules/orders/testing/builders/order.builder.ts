// src/modules/order/testing/builders/order.test.builder.ts
import { IOrder } from '../../domain/interfaces/order.interface';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethodType } from '../../../payments/domain';
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
    return this;
  }

  withPaymentId(paymentId: string | null): this {
    this.order.paymentId = paymentId;
    return this;
  }

  withPaymentMethod(method: PaymentMethodType): this {
    this.order.paymentMethod = method;
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
    return this.withStatus(OrderStatus.PENDING);
  }

  asNonCancellable(): this {
    return this.withStatus(OrderStatus.DELIVERED).withPaymentId('PAY001');
  }

  asCODPending(): this {
    return this.withPaymentMethod(PaymentMethodType.CASH_ON_DELIVERY)
      .withStatus(OrderStatus.PENDING)
      .withPaymentId(null);
  }

  asOnlinePaymentPending(): this {
    return this.withPaymentMethod(PaymentMethodType.STRIPE)
      .withStatus(OrderStatus.PENDING)
      .withPaymentId(null);
  }

  asOnlinePaymentCompleted(): this {
    return this.withPaymentMethod(PaymentMethodType.STRIPE)
      .withStatus(OrderStatus.CONFIRMED)
      .withPaymentId('PAY_STRIPE_001');
  }

  asCODDelivered(): this {
    return this.withPaymentMethod(PaymentMethodType.CASH_ON_DELIVERY)
      .withStatus(OrderStatus.DELIVERED)
      .withPaymentId('PAY_COD_001');
  }

  private recalculatePricing(): void {
    this.order.subtotal = this.order.items.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    this.order.totalPrice = this.order.subtotal + this.order.shippingCost;
  }

  build(): IOrder {
    return { ...this.order };
  }
}
