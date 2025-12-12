import {
  Reservation,
  ReservationProps,
} from '../../domain/entities/reservation';
import { ReservationStatus } from '../../domain/value-objects/reservation-status';

export class ReservationTestFactory {
  static createReservation(overrides?: Partial<ReservationProps>): Reservation {
    const defaultProps: ReservationProps = {
      id: 'RES0000001',
      orderId: 'OR0000001',
      items: [
        {
          id: null,
          productId: 'PR0000001',
          quantity: 2,
        },
      ],
      status: ReservationStatus.PENDING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new Reservation({ ...defaultProps, ...overrides });
  }

  static createPendingReservation(
    overrides?: Partial<ReservationProps>,
  ): Reservation {
    return this.createReservation({
      status: ReservationStatus.PENDING,
      ...overrides,
    });
  }

  static createConfirmedReservation(
    overrides?: Partial<ReservationProps>,
  ): Reservation {
    return this.createReservation({
      status: ReservationStatus.CONFIRMED,
      ...overrides,
    });
  }

  static createReleasedReservation(
    overrides?: Partial<ReservationProps>,
  ): Reservation {
    return this.createReservation({
      status: ReservationStatus.RELEASED,
      ...overrides,
    });
  }

  static createExpiredReservation(
    overrides?: Partial<ReservationProps>,
  ): Reservation {
    return this.createReservation({
      status: ReservationStatus.EXPIRED,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      ...overrides,
    });
  }

  static createReservationWithItems(
    items: { productId: string; quantity: number }[],
    overrides?: Partial<ReservationProps>,
  ): Reservation {
    const reservationItems = items.map((item) => ({
      ...item,
      id: null,
    }));
    return this.createReservation({
      items: reservationItems,
      ...overrides,
    });
  }
}
