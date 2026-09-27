/**
 * SQL filter vocabulary for analytics reads.
 * Values mirror Orders/Payments persisted status strings - do not import foreign domain enums here.
 */

import { ATTENTION_ORDER_STATUSES } from '../../core/application/analytics.policy';

export { ATTENTION_ORDER_STATUSES };

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

/** PostgreSQL statement_timeout for analytics queries (milliseconds). */
export const ANALYTICS_STATEMENT_TIMEOUT_MS = 5000;
