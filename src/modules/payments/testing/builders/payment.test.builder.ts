import { IPayment } from '../../domain/interfaces/payment.interface';
import { PaymentTestFactory } from '../factories/payment.test.factory';
import { PaymentMethodType } from '../../domain/value-objects/payment-method';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';

export class PaymentBuilder {
  private payment: IPayment;

  constructor() {
    this.payment = PaymentTestFactory.createMockPayment();
  }

  withId(id: string): this {
    this.payment.id = id;
    return this;
  }

  withOrderId(orderId: string): this {
    this.payment.orderId = orderId;
    return this;
  }

  withCustomerId(customerId: string): this {
    this.payment.customerId = customerId;
    return this;
  }

  withAmount(amount: number): this {
    this.payment.amount = amount;
    return this;
  }

  withCurrency(currency: string): this {
    this.payment.currency = currency;
    return this;
  }

  withPaymentMethod(method: PaymentMethodType): this {
    this.payment.paymentMethod = method;
    return this;
  }

  withStatus(status: PaymentStatusType): this {
    this.payment.status = status;
    return this;
  }

  withTransactionId(transactionId: string): this {
    this.payment.transactionId = transactionId;
    return this;
  }

  asPending(): this {
    return this.withStatus(PaymentStatusType.PENDING)
      .withTransactionId('')
      .withCompletedAt(null);
  }

  asCompleted(): this {
    return this.withStatus(PaymentStatusType.COMPLETED).withCompletedAt(
      new Date(),
    );
  }

  asFailed(reason: string): this {
    this.payment.status = PaymentStatusType.FAILED;
    this.payment.failureReason = reason;
    this.payment.completedAt = null;
    return this;
  }

  withCompletedAt(date: Date | null): this {
    this.payment.completedAt = date;
    return this;
  }

  build(): IPayment {
    return { ...this.payment };
  }
}
