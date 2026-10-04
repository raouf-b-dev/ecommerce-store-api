/**
 * Reservation TTL and order payment expiration constants in minutes.
 *
 * The order pending-payment window is 30 minutes.
 * The order expiration sweeper runs every 5 minutes.
 * A 5-minute grace period accommodates clock drift and queue processing delays.
 *
 * The reservation TTL is derived as their sum (40 minutes) so that reservations
 * are never expired and stock is never freed while an order payment window or
 * order cancellation sweeper could still be actively processing.
 */
export const ORDER_PAYMENT_EXPIRATION_MINUTES = 30;
export const ORDER_EXPIRY_SWEEP_MINUTES = 5;
export const RESERVATION_GRACE_MINUTES = 5;

export const RESERVATION_TTL_MINUTES =
  ORDER_PAYMENT_EXPIRATION_MINUTES +
  ORDER_EXPIRY_SWEEP_MINUTES +
  RESERVATION_GRACE_MINUTES; // 40
