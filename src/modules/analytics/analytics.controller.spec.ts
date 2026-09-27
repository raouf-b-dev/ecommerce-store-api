import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { GetAnalyticsOverviewUseCase } from './core/application/usecases/get-overview/get-analytics-overview.usecase';
import { GetPaymentsTimeSeriesUseCase } from './core/application/usecases/get-payments-time-series/get-payments-time-series.usecase';
import { GetTopProductsUseCase } from './core/application/usecases/get-top-products/get-top-products.usecase';
import { GetInventoryAlertsUseCase } from './core/application/usecases/get-inventory-alerts/get-inventory-alerts.usecase';
import { Result } from '../../shared-kernel/domain/result';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let getOverviewUseCase: GetAnalyticsOverviewUseCase;
  let getPaymentsTimeSeriesUseCase: GetPaymentsTimeSeriesUseCase;
  let getTopProductsUseCase: GetTopProductsUseCase;
  let getInventoryAlertsUseCase: GetInventoryAlertsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: GetAnalyticsOverviewUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success({})),
          },
        },
        {
          provide: GetPaymentsTimeSeriesUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success({})),
          },
        },
        {
          provide: GetTopProductsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success({})),
          },
        },
        {
          provide: GetInventoryAlertsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success({})),
          },
        },
      ],
    }).compile();

    controller = module.get(AnalyticsController);
    getOverviewUseCase = module.get(GetAnalyticsOverviewUseCase);
    getPaymentsTimeSeriesUseCase = module.get(GetPaymentsTimeSeriesUseCase);
    getTopProductsUseCase = module.get(GetTopProductsUseCase);
    getInventoryAlertsUseCase = module.get(GetInventoryAlertsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('overview converts period strings and calls GetAnalyticsOverviewUseCase', async () => {
    await controller.overview({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-08T00:00:00.000Z',
    });

    expect(getOverviewUseCase.execute).toHaveBeenCalledWith({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-08T00:00:00.000Z'),
    });
  });

  it('paymentsTimeSeries converts period and passes bucket', async () => {
    await controller.paymentsTimeSeries({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-08T00:00:00.000Z',
      bucket: 'week',
    });

    expect(getPaymentsTimeSeriesUseCase.execute).toHaveBeenCalledWith({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-08T00:00:00.000Z'),
      bucket: 'week',
    });
  });

  it('topProducts applies default limit of 5', async () => {
    await controller.topProducts({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-08T00:00:00.000Z',
    });

    expect(getTopProductsUseCase.execute).toHaveBeenCalledWith({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-08T00:00:00.000Z'),
      limit: 5,
    });
  });

  it('inventoryAlerts applies default limit of 20', async () => {
    await controller.inventoryAlerts({});

    expect(getInventoryAlertsUseCase.execute).toHaveBeenCalledWith({
      limit: 20,
    });
  });
});
