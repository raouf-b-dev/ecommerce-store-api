import { InventoryReconciliationJob } from './inventory-reconciliation.job';
import { ReconcileInventoryUseCase } from '../../core/application/usecases/reconcile-inventory/reconcile-inventory.usecase';
import { MetricsService } from '../../../../infrastructure/metrics/metrics.service';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { Job } from 'bullmq';

describe('InventoryReconciliationJob', () => {
  let jobHandler: InventoryReconciliationJob;
  let mockUseCase: jest.Mocked<ReconcileInventoryUseCase>;
  let mockMetricsService: jest.Mocked<MetricsService>;
  let mockCorrelation: jest.Mocked<CorrelationService>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReconcileInventoryUseCase>;

    mockMetricsService = {
      inventoryDriftCount: {
        inc: jest.fn(),
      },
    } as unknown as jest.Mocked<MetricsService>;

    mockCorrelation = {
      getId: jest.fn().mockReturnValue('test-correlation-id'),
      run: jest.fn((id, fn) => fn()),
    } as unknown as jest.Mocked<CorrelationService>;

    jobHandler = new InventoryReconciliationJob(
      mockUseCase,
      mockMetricsService,
      mockCorrelation,
    );
  });

  it('should execute reconciliation use case and increment metrics for discrepancies', async () => {
    mockUseCase.execute.mockResolvedValue(
      Result.success({
        totalChecked: 10,
        discrepancyCount: 2,
        durationMs: 15,
        checkedAt: new Date(),
        discrepancies: [
          {
            productId: 1,
            type: 'reservation_drift',
            expected: 50,
            actual: 60,
          },
          {
            productId: 2,
            type: 'reservation_drift',
            expected: 5,
            actual: 10,
          },
        ],
      }),
    );

    const mockJob = {
      id: 'job-1',
      name: 'inventory-reconciliation',
      data: {},
    } as unknown as Job<void>;

    await jobHandler.handle(mockJob);

    expect(mockUseCase.execute).toHaveBeenCalled();
    expect(mockMetricsService.inventoryDriftCount.inc).toHaveBeenCalledTimes(2);
    expect(mockMetricsService.inventoryDriftCount.inc).toHaveBeenCalledWith({
      type: 'reservation_drift',
    });
  });
});
