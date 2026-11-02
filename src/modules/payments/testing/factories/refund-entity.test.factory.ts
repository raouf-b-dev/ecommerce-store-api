import { RefundEntity } from '../../secondary-adapters/orm/refund.schema';
import { RefundStatusType } from '../../core/domain/value-objects/refund-status';

export class RefundEntityTestFactory {
  static createRefundEntity(overrides?: Partial<RefundEntity>): RefundEntity {
    return Object.assign(new RefundEntity(), {
      id: 1,
      paymentId: 1,
      amount: 50,
      currency: 'USD',
      reason: 'Defective product',
      status: RefundStatusType.COMPLETED,
      createdAt: new Date('2025-01-02T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
      ...overrides,
    });
  }
}
