/**
 * Shared reservation TTL and order payment window in minutes (15 minutes).
 *
 * Both the inventory reservation TTL and the order pending-payment window
 * share this constant so the reservation sweeper does not free stock before
 * the order payment window closes.
 */
export const RESERVATION_TTL_MINUTES = 15;
export const ORDER_PAYMENT_EXPIRATION_MINUTES = RESERVATION_TTL_MINUTES;
