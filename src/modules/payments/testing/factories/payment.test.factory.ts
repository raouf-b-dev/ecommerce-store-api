import { IPayment } from '../../domain/interfaces/payment.interface';
import { PaymentMethodType } from '../../domain/value-objects/payment-method';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';

export class PaymentTestFactory {
  static createMockPayment(overrides?: Partial<IPayment>): IPayment {
    const basePayment: IPayment = {
      id: 1,
      orderId: 1,
      customerId: 1,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      status: PaymentStatusType.COMPLETED,
      transactionId: 'tx_123456789',
      gatewayPaymentIntentId: null,
      gatewayClientSecret: null,
      paymentMethodInfo: null,
      refundedAmount: 0,
      refunds: [],
      failureReason: null,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
      completedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...basePayment, ...overrides };
  }

  static createPendingPayment(overrides?: Partial<IPayment>): IPayment {
    return this.createMockPayment({
      status: PaymentStatusType.PENDING,
      transactionId: null,
      completedAt: null,
      ...overrides,
    });
  }

  static createFailedPayment(overrides?: Partial<IPayment>): IPayment {
    return this.createMockPayment({
      status: PaymentStatusType.FAILED,
      failureReason: 'Insufficient funds',
      completedAt: null,
      ...overrides,
    });
  }

  static createRefundedPayment(overrides?: Partial<IPayment>): IPayment {
    return this.createMockPayment({
      status: PaymentStatusType.REFUNDED,
      refundedAmount: 100,
      ...overrides,
    });
  }

  static createPartiallyRefundedPayment(
    overrides?: Partial<IPayment>,
  ): IPayment {
    return this.createMockPayment({
      status: PaymentStatusType.PARTIALLY_REFUNDED,
      refundedAmount: 50,
      ...overrides,
    });
  }

  static createCODPayment(overrides?: Partial<IPayment>): IPayment {
    return this.createMockPayment({
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      status: PaymentStatusType.NOT_REQUIRED_YET,
      transactionId: null,
      completedAt: null,
      ...overrides,
    });
  }
}
