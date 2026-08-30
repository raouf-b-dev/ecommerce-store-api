/** Analytics-owned query policy (no foreign BC imports). */

export const ANALYTICS_TIMEZONE = 'UTC' as const;

export const ANALYTICS_MAX_RANGE_DAYS = 90;

export type AnalyticsBucket = 'day' | 'week';

export const ANALYTICS_BUCKETS: readonly AnalyticsBucket[] = [
  'day',
  'week',
] as const;
