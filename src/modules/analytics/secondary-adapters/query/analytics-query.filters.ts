/**
 * SQL filter vocabulary for analytics reads.
 * Values mirror Orders/Payments persisted status strings — do not import foreign domain enums here.
 */

/** Successful payment statuses counted toward revenue (gross / refunded / net). */
export const REVENUE_PAYMENT_STATUSES: readonly string[] = [
  'CAPTURED',
  'COMPLETED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;

/**
 * Order statuses included in top-products revenue attribution
 * (payment succeeded / fulfillment in progress or done).
 */
export const TOP_PRODUCT_ORDER_STATUSES: readonly string[] = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
] as const;

/** Statuses that need operator action on the ops home. */
export const ATTENTION_ORDER_STATUSES: readonly string[] = [
  'pending_payment',
  'confirmed',
  'processing',
] as const;

/** PostgreSQL statement_timeout for analytics queries (milliseconds). */
export const ANALYTICS_STATEMENT_TIMEOUT_MS = 5000;
