import { GetInventoryAlertsUseCase } from './get-inventory-alerts.usecase';
import { isFailure } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { MockAnalyticsQueryService } from 'src/modules/analytics/testing';
import type { InventoryAlertsResult } from '../../queries/results/inventory-alerts.result';

describe('GetInventoryAlertsUseCase', () => {
  let useCase: GetInventoryAlertsUseCase;
  let mockQueryService: MockAnalyticsQueryService;

  const query = { limit: 20 };

  const sampleAlerts: InventoryAlertsResult = {
    items: [
      {
        productId: 1,
        productTitle: 'Socks',
        sku: 'CLOT-1',
        availableQuantity: 2,
        lowStockThreshold: 5,
      },
    ],
  };

  beforeEach(() => {
    mockQueryService = new MockAnalyticsQueryService();
    useCase = new GetInventoryAlertsUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('returns success when query service succeeds', async () => {
    mockQueryService.mockSuccessfulInventoryAlerts(sampleAlerts);

    const result = await useCase.execute(query);

    expect(mockQueryService.getInventoryAlerts).toHaveBeenCalledWith(query);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(sampleAlerts);
  });

  it('propagates query service failure as usecase failure', async () => {
    mockQueryService.mockFailedInventoryAlerts('alerts failed');

    const result = await useCase.execute(query);

    expect(isFailure(result)).toBe(true);
  });
});
