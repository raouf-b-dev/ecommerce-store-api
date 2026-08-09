import { PaymentListItemDTO } from '../../core/application/queries/results/payment-list-item.result';
import { PaymentDetailDTO } from '../../core/application/queries/results/payment-detail.result';
import { RawPaymentListQueryRow } from '../../secondary-adapters/dto/raw-payment-list-query-row.interface';

export class PaymentDtoTestFactory {
  static createRawPaymentListQueryRow(
    overrides?: Partial<RawPaymentListQueryRow>,
  ): RawPaymentListQueryRow {
    return {
      id: 1,
      orderId: 100,
      userId: 2,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      amount: '99.99',
      currency: 'USD',
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      transactionId: 'txn_123',
      failureReason: null,
      metadata: '{"provider":"stripe"}',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  static createPaymentListItemDTO(
    overrides?: Partial<PaymentListItemDTO>,
  ): PaymentListItemDTO {
    return {
      id: 1,
      orderId: 10,
      userId: 2,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      amount: 99.99,
      currency: 'USD',
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      transactionId: 'txn_123456',
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  static createPaymentDetailDTO(
    overrides?: Partial<PaymentDetailDTO>,
  ): PaymentDetailDTO {
    const base = this.createPaymentListItemDTO(overrides);
    return {
      ...base,
      failureReason: null,
      metadata: { provider: 'stripe' },
      updatedAt: base.createdAt,
      ...overrides,
    };
  }
}
