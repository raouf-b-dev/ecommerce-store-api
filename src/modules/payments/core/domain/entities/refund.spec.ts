import { RefundTestFactory } from 'src/modules/payments/testing';
import { Refund } from './refund';
import { RefundStatusType } from '../value-objects/refund-status';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';

describe('Refund', () => {
  describe('construction', () => {
    it.each([
      ['negative amount', { amount: -1 }],
      ['missing reason', { reason: '' }],
      ['missing paymentId', { paymentId: 0 }],
    ] as const)('rejects %s', (_label, override) => {
      expect(() => RefundTestFactory.createDomainRefund(override)).toThrow(
        DomainError,
      );
    });
  });

  describe('status lifecycle', () => {
    it('progresses through approve, processing, and completed', () => {
      const refund = RefundTestFactory.createDomainRefund({
        status: RefundStatusType.PENDING,
      });

      refund.approve();
      expect(refund.status).toBe(RefundStatusType.APPROVED);

      refund.markAsProcessing();
      expect(refund.status).toBe(RefundStatusType.PROCESSING);

      refund.markAsCompleted();
      expect(refund.status).toBe(RefundStatusType.COMPLETED);
    });

    it('rejects and fails with optional reason update', () => {
      const refund = RefundTestFactory.createDomainRefund();

      refund.reject('Policy violation');
      expect(refund.status).toBe(RefundStatusType.REJECTED);
      expect(refund.reason).toBe('Policy violation');

      refund.markAsFailed('Gateway error');
      expect(refund.status).toBe(RefundStatusType.FAILED);
      expect(refund.reason).toBe('Gateway error');
    });
  });

  describe('serialization', () => {
    it('round-trips through toPrimitives and fromPrimitives', () => {
      const original = RefundTestFactory.createDomainRefund();
      const restored = Refund.fromPrimitives(original.toPrimitives());

      expect(restored.amount).toBe(original.amount);
      expect(restored.reason).toBe(original.reason);
      expect(restored.status).toBe(original.status);
    });
  });
});
