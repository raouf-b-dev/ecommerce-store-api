import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { PaymentStatus, PaymentStatusType } from './payment-status';

/** Independent expected specification — do not derive from PaymentStatus helpers. */
const allStatuses = Object.values(PaymentStatusType);

const successfulStatuses: PaymentStatusType[] = [
  PaymentStatusType.CAPTURED,
  PaymentStatusType.COMPLETED,
];

const refundableStatuses: PaymentStatusType[] = [
  PaymentStatusType.CAPTURED,
  PaymentStatusType.COMPLETED,
];

const refundedStatuses: PaymentStatusType[] = [
  PaymentStatusType.REFUNDED,
  PaymentStatusType.PARTIALLY_REFUNDED,
];

describe('PaymentStatus', () => {
  describe('construction', () => {
    describe('when status is a known PaymentStatusType', () => {
      it.each(allStatuses)('accepts %s', (status) => {
        const vo = new PaymentStatus(status);

        expect(vo.status).toBe(status);
        expect(vo.toString()).toBe(status);
      });
    });

    describe('when status is unknown', () => {
      it('throws DomainError', () => {
        expect(() => new PaymentStatus('UNKNOWN' as PaymentStatusType)).toThrow(
          DomainError,
        );
        expect(() => new PaymentStatus('UNKNOWN' as PaymentStatusType)).toThrow(
          'Invalid payment status: UNKNOWN',
        );
      });
    });
  });

  describe('factories', () => {
    it('creates pending, completed, failed, and refunded statuses', () => {
      expect(PaymentStatus.pending().status).toBe(PaymentStatusType.PENDING);
      expect(PaymentStatus.completed().status).toBe(
        PaymentStatusType.COMPLETED,
      );
      expect(PaymentStatus.failed().status).toBe(PaymentStatusType.FAILED);
      expect(PaymentStatus.refunded().status).toBe(PaymentStatusType.REFUNDED);
    });

    it('parses status string via from()', () => {
      expect(PaymentStatus.from('AUTHORIZED').status).toBe(
        PaymentStatusType.AUTHORIZED,
      );
    });
  });

  describe('equality', () => {
    it('equals another VO with the same status', () => {
      expect(
        PaymentStatus.completed().equals(
          new PaymentStatus(PaymentStatusType.COMPLETED),
        ),
      ).toBe(true);
    });

    it('does not equal a VO with a different status', () => {
      expect(PaymentStatus.completed().equals(PaymentStatus.failed())).toBe(
        false,
      );
    });
  });

  describe('single-status predicates', () => {
    it.each([
      {
        status: PaymentStatusType.PENDING,
        predicate: 'isPending' as const,
      },
      {
        status: PaymentStatusType.AUTHORIZED,
        predicate: 'isAuthorized' as const,
      },
      {
        status: PaymentStatusType.CAPTURED,
        predicate: 'isCaptured' as const,
      },
      {
        status: PaymentStatusType.COMPLETED,
        predicate: 'isCompleted' as const,
      },
      {
        status: PaymentStatusType.FAILED,
        predicate: 'isFailed' as const,
      },
      {
        status: PaymentStatusType.CANCELLED,
        predicate: 'isCancelled' as const,
      },
    ])('$predicate is true only for %s', ({ status, predicate }) => {
      for (const candidate of allStatuses) {
        const vo = new PaymentStatus(candidate);
        expect(vo[predicate]()).toBe(candidate === status);
      }
    });
  });

  describe('isSuccessful', () => {
    it.each(successfulStatuses)('returns true for %s', (status) => {
      expect(new PaymentStatus(status).isSuccessful()).toBe(true);
    });

    it.each(allStatuses.filter((s) => !successfulStatuses.includes(s)))(
      'returns false for %s',
      (status) => {
        expect(new PaymentStatus(status).isSuccessful()).toBe(false);
      },
    );
  });

  describe('canBeRefunded', () => {
    it.each(refundableStatuses)('returns true for %s', (status) => {
      expect(new PaymentStatus(status).canBeRefunded()).toBe(true);
    });

    it.each(allStatuses.filter((s) => !refundableStatuses.includes(s)))(
      'returns false for %s',
      (status) => {
        expect(new PaymentStatus(status).canBeRefunded()).toBe(false);
      },
    );
  });

  describe('isRefunded', () => {
    it.each(refundedStatuses)('returns true for %s', (status) => {
      expect(new PaymentStatus(status).isRefunded()).toBe(true);
    });

    it.each(allStatuses.filter((s) => !refundedStatuses.includes(s)))(
      'returns false for %s',
      (status) => {
        expect(new PaymentStatus(status).isRefunded()).toBe(false);
      },
    );
  });
});
