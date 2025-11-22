import { RefundEntity } from '../../infrastructure/orm/refund.schema';
import { RefundStatusType } from '../../domain/value-objects/refund-status';
import { PaymentEntity } from '../../infrastructure/orm/payment.schema';

export class RefundEntityTestFactory {
  static createRefundEntity(overrides?: Partial<RefundEntity>): RefundEntity {
    const defaultEntity: RefundEntity = {
      id: 'RE0000001',
      paymentId: 'PA0000001',
      amount: 50,
      currency: 'USD',
      reason: 'Defective product',
      status: RefundStatusType.COMPLETED,
      payment: {} as PaymentEntity, // Usually not needed for simple tests, or mocked separately
      createdAt: new Date('2025-01-02T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
    };

    return { ...defaultEntity, ...overrides };
  }
}
