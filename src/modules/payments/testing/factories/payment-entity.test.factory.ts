import { PaymentEntity } from '../../infrastructure/orm/payment.schema';
import { PaymentMethodType } from '../../domain/value-objects/payment-method';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';

export class PaymentEntityTestFactory {
  static createPaymentEntity(
    overrides?: Partial<PaymentEntity>,
  ): PaymentEntity {
    const defaultEntity: PaymentEntity = {
      id: 'PA0000001',
      orderId: 'OR0000001',
      customerId: 'CU0000001',
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      status: PaymentStatusType.COMPLETED,
      transactionId: 'tx_123456789',
      paymentMethodInfo: null,
      refundedAmount: 0,
      refunds: [],
      failureReason: null,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
      completedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...defaultEntity, ...overrides };
  }

  static createPendingEntity(
    overrides?: Partial<PaymentEntity>,
  ): PaymentEntity {
    return this.createPaymentEntity({
      status: PaymentStatusType.PENDING,
      transactionId: null,
      completedAt: null,
      ...overrides,
    });
  }

  static createFailedEntity(overrides?: Partial<PaymentEntity>): PaymentEntity {
    return this.createPaymentEntity({
      status: PaymentStatusType.FAILED,
      failureReason: 'Insufficient funds',
      completedAt: null,
      ...overrides,
    });
  }

  static createRefundedEntity(
    overrides?: Partial<PaymentEntity>,
  ): PaymentEntity {
    return this.createPaymentEntity({
      status: PaymentStatusType.REFUNDED,
      refundedAmount: 100,
      ...overrides,
    });
  }

  static createCODEntity(overrides?: Partial<PaymentEntity>): PaymentEntity {
    return this.createPaymentEntity({
      paymentMethod: PaymentMethodType.CASH_ON_DELIVERY,
      status: PaymentStatusType.NOT_REQUIRED_YET,
      transactionId: null,
      completedAt: null,
      ...overrides,
    });
  }
}
