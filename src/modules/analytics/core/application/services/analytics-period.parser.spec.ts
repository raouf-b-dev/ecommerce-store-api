import {
  parseAnalyticsPeriod,
  previousPeriodWindow,
} from './analytics-period.parser';

describe('analytics-period.parser', () => {
  describe('parseAnalyticsPeriod', () => {
    it('converts ISO strings to Dates', () => {
      const { from, to } = parseAnalyticsPeriod(
        '2026-08-01T00:00:00.000Z',
        '2026-08-08T00:00:00.000Z',
      );
      expect(from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
      expect(to.toISOString()).toBe('2026-08-08T00:00:00.000Z');
    });
  });

  describe('previousPeriodWindow', () => {
    it('returns an equal-length window ending at from', () => {
      const from = new Date('2026-08-08T00:00:00.000Z');
      const to = new Date('2026-08-15T00:00:00.000Z');
      const prev = previousPeriodWindow(from, to);
      expect(prev.to.toISOString()).toBe(from.toISOString());
      expect(prev.from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });
  });
});
