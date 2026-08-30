import { GetPaymentsTimeSeriesUseCase } from './get-payments-time-series.usecase';
import { isFailure } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { MockAnalyticsQueryService } from 'src/modules/analytics/testing';
import type { PaymentsTimeSeriesResult } from '../../queries/results/payments-time-series.result';

describe('GetPaymentsTimeSeriesUseCase', () => {
  let useCase: GetPaymentsTimeSeriesUseCase;
  let mockQueryService: MockAnalyticsQueryService;

  const query = {
    from: new Date('2026-08-01T00:00:00.000Z'),
    to: new Date('2026-08-08T00:00:00.000Z'),
    bucket: 'day' as const,
  };

  const sampleSeries: PaymentsTimeSeriesResult = {
    timezone: 'UTC',
    bucket: 'day',
    from: query.from.toISOString(),
    to: query.to.toISOString(),
    buckets: [],
  };

  beforeEach(() => {
    mockQueryService = new MockAnalyticsQueryService();
    useCase = new GetPaymentsTimeSeriesUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('returns success when query service succeeds', async () => {
    mockQueryService.mockSuccessfulPaymentsTimeSeries(sampleSeries);

    const result = await useCase.execute(query);

    expect(mockQueryService.getPaymentsTimeSeries).toHaveBeenCalledWith(query);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(sampleSeries);
  });

  it('propagates query service failure as usecase failure', async () => {
    mockQueryService.mockFailedPaymentsTimeSeries('series failed');

    const result = await useCase.execute(query);

    expect(isFailure(result)).toBe(true);
  });
});
