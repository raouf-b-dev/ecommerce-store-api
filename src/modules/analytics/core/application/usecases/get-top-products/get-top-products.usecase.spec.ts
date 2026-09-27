import { GetTopProductsUseCase } from './get-top-products.usecase';
import { isFailure } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { MockAnalyticsQueryService } from 'src/modules/analytics/testing';
import type { TopProductsResult } from '../../queries/results/top-products.result';

describe('GetTopProductsUseCase', () => {
  let useCase: GetTopProductsUseCase;
  let mockQueryService: MockAnalyticsQueryService;

  const query = {
    from: new Date('2026-08-01T00:00:00.000Z'),
    to: new Date('2026-08-08T00:00:00.000Z'),
    limit: 5,
  };

  const sampleTop: TopProductsResult = {
    timezone: 'UTC',
    from: query.from.toISOString(),
    to: query.to.toISOString(),
    items: [
      {
        productId: 1,
        name: 'Mat',
        sku: 'SPOR-1',
        unitsSold: 3,
        lineRevenue: 89.97,
      },
    ],
  };

  beforeEach(() => {
    mockQueryService = new MockAnalyticsQueryService();
    useCase = new GetTopProductsUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('returns success when query service succeeds', async () => {
    mockQueryService.mockSuccessfulTopProducts(sampleTop);

    const result = await useCase.execute(query);

    expect(mockQueryService.getTopProducts).toHaveBeenCalledWith(query);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(sampleTop);
  });

  it('propagates query service failure as usecase failure', async () => {
    mockQueryService.mockFailedTopProducts('top products failed');

    const result = await useCase.execute(query);

    expect(isFailure(result)).toBe(true);
  });
});
