import { GetAnalyticsOverviewUseCase } from './get-analytics-overview.usecase';
import { isFailure } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { MockAnalyticsQueryService } from 'src/modules/analytics/testing';
import type { AnalyticsOverviewResult } from '../../queries/results/analytics-overview.result';

describe('GetAnalyticsOverviewUseCase', () => {
  let useCase: GetAnalyticsOverviewUseCase;
  let mockQueryService: MockAnalyticsQueryService;

  const from = new Date('2026-08-01T00:00:00.000Z');
  const to = new Date('2026-08-08T00:00:00.000Z');

  const sampleOverview: AnalyticsOverviewResult = {
    timezone: 'UTC',
    from: from.toISOString(),
    to: to.toISOString(),
    current: {
      netRevenue: 100,
      grossRevenue: 120,
      refundedAmount: 20,
      ordersCount: 5,
      paidOrderCount: 4,
      aov: 25,
      currency: 'USD',
    },
    previous: {
      netRevenue: 80,
      grossRevenue: 90,
      refundedAmount: 10,
      ordersCount: 3,
      paidOrderCount: 3,
      aov: 26.666666666666668,
      currency: 'USD',
    },
    ordersNeedingAttention: [{ status: 'pending_payment', count: 2 }],
    lowStockCount: 1,
  };

  beforeEach(() => {
    mockQueryService = new MockAnalyticsQueryService();
    useCase = new GetAnalyticsOverviewUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('returns success and passes previous-period window to the query service', async () => {
    mockQueryService.mockSuccessfulOverview(sampleOverview);

    const result = await useCase.execute({ from, to });

    expect(mockQueryService.getOverview).toHaveBeenCalledWith({
      from,
      to,
      previousFrom: new Date('2026-07-25T00:00:00.000Z'),
      previousTo: from,
    });
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(sampleOverview);
  });

  it('propagates query service failure as usecase failure', async () => {
    mockQueryService.mockFailedOverview('overview failed');

    const result = await useCase.execute({ from, to });

    expect(isFailure(result)).toBe(true);
  });
});
