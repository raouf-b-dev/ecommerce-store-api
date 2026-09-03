import type { AnalyticsBucket } from '../../core/application/analytics.policy';

/** Truncate to UTC day or week start (Monday for week, matching date_trunc('week')). */
export function truncateUtcBucket(date: Date, bucket: AnalyticsBucket): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  if (bucket === 'day') {
    return d;
  }
  // PostgreSQL date_trunc('week') uses Monday as week start (ISO).
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const daysFromMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  return d;
}

export function addUtcBucket(date: Date, bucket: AnalyticsBucket): Date {
  const next = new Date(date.getTime());
  if (bucket === 'day') {
    next.setUTCDate(next.getUTCDate() + 1);
  } else {
    next.setUTCDate(next.getUTCDate() + 7);
  }
  return next;
}

/** Inclusive zero-fill bucket starts for charts (UTC). */
export function enumerateUtcBuckets(
  from: Date,
  to: Date,
  bucket: AnalyticsBucket,
): Date[] {
  const start = truncateUtcBucket(from, bucket);
  const end = truncateUtcBucket(to, bucket);
  const buckets: Date[] = [];
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    buckets.push(new Date(cursor.getTime()));
    cursor = addUtcBucket(cursor, bucket);
  }
  return buckets;
}
