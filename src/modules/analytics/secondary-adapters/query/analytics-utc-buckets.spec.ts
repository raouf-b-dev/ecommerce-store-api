import {
  addUtcBucket,
  enumerateUtcBuckets,
  truncateUtcBucket,
} from './analytics-utc-buckets';

describe('analytics UTC buckets', () => {
  it('truncates to UTC day', () => {
    const truncated = truncateUtcBucket(
      new Date('2026-08-15T18:30:00.000Z'),
      'day',
    );
    expect(truncated.toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });

  it('truncates week to Monday UTC', () => {
    // 2026-08-15 is Saturday; week start Monday 2026-08-10
    const truncated = truncateUtcBucket(
      new Date('2026-08-15T12:00:00.000Z'),
      'week',
    );
    expect(truncated.toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('enumerates contiguous zero-fill day buckets inclusive', () => {
    const buckets = enumerateUtcBuckets(
      new Date('2026-08-01T12:00:00.000Z'),
      new Date('2026-08-03T18:00:00.000Z'),
      'day',
    );
    expect(buckets.map((d) => d.toISOString())).toEqual([
      '2026-08-01T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
      '2026-08-03T00:00:00.000Z',
    ]);
  });

  it('addUtcBucket advances by day or week', () => {
    const day = new Date('2026-08-01T00:00:00.000Z');
    expect(addUtcBucket(day, 'day').toISOString()).toBe(
      '2026-08-02T00:00:00.000Z',
    );
    expect(addUtcBucket(day, 'week').toISOString()).toBe(
      '2026-08-08T00:00:00.000Z',
    );
  });
});
