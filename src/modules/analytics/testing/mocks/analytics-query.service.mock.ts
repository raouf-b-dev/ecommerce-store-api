import { AnalyticsQueryService } from '../../core/application/ports/analytics-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { AnalyticsOverviewResult } from '../../core/application/queries/results/analytics-overview.result';
import { PaymentsTimeSeriesResult } from '../../core/application/queries/results/payments-time-series.result';
import { TopProductsResult } from '../../core/application/queries/results/top-products.result';
import { InventoryAlertsResult } from '../../core/application/queries/results/inventory-alerts.result';
import type { AnalyticsOverviewQuery } from '../../core/application/queries/analytics-overview.query';
import type { PaymentsTimeSeriesQuery } from '../../core/application/queries/payments-time-series.query';
import type { TopProductsQuery } from '../../core/application/queries/top-products.query';
import type { InventoryAlertsQuery } from '../../core/application/queries/inventory-alerts.query';

export class MockAnalyticsQueryService implements AnalyticsQueryService {
  getOverview = jest.fn<
    Promise<Result<AnalyticsOverviewResult, QueryError>>,
    [AnalyticsOverviewQuery]
  >();

  getPaymentsTimeSeries = jest.fn<
    Promise<Result<PaymentsTimeSeriesResult, QueryError>>,
    [PaymentsTimeSeriesQuery]
  >();

  getTopProducts = jest.fn<
    Promise<Result<TopProductsResult, QueryError>>,
    [TopProductsQuery]
  >();

  getInventoryAlerts = jest.fn<
    Promise<Result<InventoryAlertsResult, QueryError>>,
    [InventoryAlertsQuery]
  >();

  mockSuccessfulOverview(result: AnalyticsOverviewResult): void {
    this.getOverview.mockResolvedValue(Result.success(result));
  }

  mockSuccessfulPaymentsTimeSeries(result: PaymentsTimeSeriesResult): void {
    this.getPaymentsTimeSeries.mockResolvedValue(Result.success(result));
  }

  mockSuccessfulTopProducts(result: TopProductsResult): void {
    this.getTopProducts.mockResolvedValue(Result.success(result));
  }

  mockSuccessfulInventoryAlerts(result: InventoryAlertsResult): void {
    this.getInventoryAlerts.mockResolvedValue(Result.success(result));
  }

  mockFailedOverview(message = 'query failed'): void {
    this.getOverview.mockResolvedValue(Result.failure(new QueryError(message)));
  }

  mockFailedPaymentsTimeSeries(message = 'query failed'): void {
    this.getPaymentsTimeSeries.mockResolvedValue(
      Result.failure(new QueryError(message)),
    );
  }

  mockFailedTopProducts(message = 'query failed'): void {
    this.getTopProducts.mockResolvedValue(
      Result.failure(new QueryError(message)),
    );
  }

  mockFailedInventoryAlerts(message = 'query failed'): void {
    this.getInventoryAlerts.mockResolvedValue(
      Result.failure(new QueryError(message)),
    );
  }

  reset(): void {
    this.getOverview.mockReset();
    this.getPaymentsTimeSeries.mockReset();
    this.getTopProducts.mockReset();
    this.getInventoryAlerts.mockReset();
  }
}
