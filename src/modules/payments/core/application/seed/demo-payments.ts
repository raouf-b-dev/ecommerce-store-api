/**
 * Relative payment timestamps for demo seed (offsets from seed-time `now` UTC).
 * Pending-payment orders are omitted by the CLI (no payment row).
 */
export interface DemoPaymentSeedMeta {
  daysAgo: number;
  /** When set, seed a completed partial refund for this amount (USD). */
  withPartialRefundAmount?: number;
}

export const DEMO_PAYMENT_BY_REFERENCE: Record<string, DemoPaymentSeedMeta> = {
  'Confirmed Electronics Order': { daysAgo: 6 },
  'Shipped Apparel Order': { daysAgo: 3 },
  'Delivered Home & Books Order': {
    daysAgo: 0,
    withPartialRefundAmount: 20,
  },
};

/** Noon UTC on the calendar day `days` before `now` (UTC). */
export function utcDaysAgo(now: Date, days: number): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      12,
      0,
      0,
      0,
    ),
  );
}
