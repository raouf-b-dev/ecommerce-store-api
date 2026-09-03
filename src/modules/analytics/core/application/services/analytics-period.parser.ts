/** Convert overview/series/top-products period query strings to Dates (UTC ISO).
 * Range validation is owned by AnalyticsPeriodQueryDto / IsAnalyticsPeriodRange.
 */
export function parseAnalyticsPeriod(
  fromRaw: string,
  toRaw: string,
): { from: Date; to: Date } {
  return { from: new Date(fromRaw), to: new Date(toRaw) };
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
