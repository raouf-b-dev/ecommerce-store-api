import {
  parseAnalyticsPeriod,
  previousPeriodWindow,
} from './analytics-period.parser';

describe('analytics-period.parser', () => {
  describe('parseAnalyticsPeriod', () => {
    it('accepts a valid range within max days', () => {
      const { from, to } = parseAnalyticsPeriod(
        '2026-08-01T00:00:00.000Z',
        '2026-08-08T00:00:00.000Z',
      );
      expect(from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
      expect(to.toISOString()).toBe('2026-08-08T00:00:00.000Z');
    });

    it('rejects inverted range', () => {
      expect(() =>
        parseAnalyticsPeriod(
          '2026-08-10T00:00:00.000Z',
          '2026-08-01T00:00:00.000Z',
        ),
      ).toThrow(/from must be less than or equal to to/);
    });

    it('rejects ranges wider than 90 days', () => {
      expect(() =>
        parseAnalyticsPeriod(
          '2026-01-01T00:00:00.000Z',
          '2026-05-01T00:00:00.000Z',
        ),
      ).toThrow(/90 days/);
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
