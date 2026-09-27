import { Reservation } from './reservation';
import { ReservationStatus } from '../value-objects/reservation-status';
import { ReservationTestFactory } from 'src/modules/inventory/testing';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('Reservation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('sets expiresAt based on ttlMinutes', () => {
      const result = Reservation.create({
        orderId: 10,
        items: [{ id: null, productId: 1, quantity: 2 }],
        ttlMinutes: 15,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.expiresAt).toEqual(new Date('2025-06-01T12:15:00Z'));
    });
  });

  describe('isExpired', () => {
    it('returns false before ttl and true after', () => {
      const reservation = ReservationTestFactory.createPendingReservation({
        expiresAt: new Date('2025-06-01T12:15:00Z'),
      });

      expect(reservation.isExpired()).toBe(false);

      jest.setSystemTime(new Date('2025-06-01T12:16:00Z'));
      expect(reservation.isExpired()).toBe(true);
    });
  });

  describe('confirm', () => {
    describe('when pending and not expired', () => {
      it('transitions to CONFIRMED', () => {
        const reservation = ReservationTestFactory.createPendingReservation({
          expiresAt: new Date('2025-06-01T13:00:00Z'),
        });

        ResultAssertionHelper.assertResultSuccess(reservation.confirm());
        expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
      });
    });

    describe('when expired', () => {
      it('returns failure', () => {
        const reservation = ReservationTestFactory.createPendingReservation({
          expiresAt: new Date('2025-06-01T11:00:00Z'),
        });

        ResultAssertionHelper.assertResultFailure(
          reservation.confirm(),
          'Cannot confirm expired reservation',
          DomainError,
        );
      });
    });

    describe('when already confirmed', () => {
      it('returns failure', () => {
        const reservation = ReservationTestFactory.createConfirmedReservation();

        ResultAssertionHelper.assertResultFailure(
          reservation.confirm(),
          `Cannot confirm reservation in ${ReservationStatus.CONFIRMED} status`,
          DomainError,
        );
      });
    });
  });

  describe('release', () => {
    it('marks pending reservation as released', () => {
      const reservation = ReservationTestFactory.createPendingReservation();

      ResultAssertionHelper.assertResultSuccess(reservation.release());
      expect(reservation.status).toBe(ReservationStatus.RELEASED);
    });

    it('is idempotent when already released', () => {
      const reservation = ReservationTestFactory.createReleasedReservation();

      ResultAssertionHelper.assertResultSuccess(reservation.release());
      expect(reservation.status).toBe(ReservationStatus.RELEASED);
    });
  });

  describe('expire', () => {
    it('expires pending reservation', () => {
      const reservation = ReservationTestFactory.createPendingReservation();

      ResultAssertionHelper.assertResultSuccess(reservation.expire());
      expect(reservation.status).toBe(ReservationStatus.EXPIRED);
    });

    it('rejects expire when not pending', () => {
      const reservation = ReservationTestFactory.createConfirmedReservation();

      ResultAssertionHelper.assertResultFailure(
        reservation.expire(),
        `Cannot expire reservation in ${ReservationStatus.CONFIRMED} status`,
        DomainError,
      );
    });
  });

  describe('construction', () => {
    it('rejects reservation without items', () => {
      expect(() =>
        ReservationTestFactory.createReservation({ items: [] }),
      ).toThrow(DomainError);
    });
  });
});
