import { ANALYTICS_MAX_RANGE_DAYS } from '../analytics.policy';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse and validate overview/series/top-products period query strings (UTC ISO). */
export function parseAnalyticsPeriod(
  fromRaw: string,
  toRaw: string,
): { from: Date; to: Date } {
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('from and to must be valid ISO-8601 timestamps');
  }
  if (from.getTime() > to.getTime()) {
    throw new Error('from must be less than or equal to to');
  }
  const rangeMs = to.getTime() - from.getTime();
  const maxMs = ANALYTICS_MAX_RANGE_DAYS * MS_PER_DAY;
  if (rangeMs > maxMs) {
    throw new Error(
      `Analytics range must be at most ${ANALYTICS_MAX_RANGE_DAYS} days`,
    );
  }
  return { from, to };
}

/** Equal-length comparison window ending at `from` (for overview previous KPIs). */
export function previousPeriodWindow(
  from: Date,
  to: Date,
): { from: Date; to: Date } {
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - durationMs);
  return { from: prevFrom, to: prevTo };
}
