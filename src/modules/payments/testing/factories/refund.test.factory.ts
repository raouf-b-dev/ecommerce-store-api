import { IRefund } from '../../domain/interfaces/refund.interface';
import { RefundStatusType } from '../../domain/value-objects/refund-status';

export class RefundTestFactory {
  static createMockRefund(overrides?: Partial<IRefund>): IRefund {
    const baseRefund: IRefund = {
      id: 1,
      paymentId: 1,
      amount: 50,
      currency: 'USD',
      reason: 'Defective product',
      status: RefundStatusType.COMPLETED,
      createdAt: new Date('2025-01-02T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
    };

    return { ...baseRefund, ...overrides };
  }

  static createPendingRefund(overrides?: Partial<IRefund>): IRefund {
    return this.createMockRefund({
      status: RefundStatusType.PENDING,
      ...overrides,
    });
  }

  static createFailedRefund(overrides?: Partial<IRefund>): IRefund {
    return this.createMockRefund({
      status: RefundStatusType.FAILED,
      ...overrides,
    });
  }
}
