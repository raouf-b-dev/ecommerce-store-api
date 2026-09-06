import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AnalyticsPeriodQueryDto } from './analytics-period-query.dto';
import { PaymentsTimeSeriesQueryDto } from './payments-time-series-query.dto';

describe('Analytics query DTOs', () => {
  it('rejects inverted ranges', async () => {
    const dto = plainToInstance(AnalyticsPeriodQueryDto, {
      from: '2026-08-10T00:00:00.000Z',
      to: '2026-08-01T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects ranges wider than 90 days', async () => {
    const dto = plainToInstance(AnalyticsPeriodQueryDto, {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-05-01T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a 7-day range', async () => {
    const dto = plainToInstance(AnalyticsPeriodQueryDto, {
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-08T00:00:00.000Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid bucket values', async () => {
    const dto = plainToInstance(PaymentsTimeSeriesQueryDto, {
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-08T00:00:00.000Z',
      bucket: 'month',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'bucket')).toBe(true);
  });

  it('accepts day and week buckets', async () => {
    for (const bucket of ['day', 'week'] as const) {
      const dto = plainToInstance(PaymentsTimeSeriesQueryDto, {
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-08T00:00:00.000Z',
        bucket,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
