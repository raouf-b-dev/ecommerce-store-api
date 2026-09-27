import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';
import type { AnalyticsOverviewQuery } from '../queries/analytics-overview.query';
import type { PaymentsTimeSeriesQuery } from '../queries/payments-time-series.query';
import type { TopProductsQuery } from '../queries/top-products.query';
import type { InventoryAlertsQuery } from '../queries/inventory-alerts.query';
import type { AnalyticsOverviewResult } from '../queries/results/analytics-overview.result';
import type { PaymentsTimeSeriesResult } from '../queries/results/payments-time-series.result';
import type { TopProductsResult } from '../queries/results/top-products.result';
import type { InventoryAlertsResult } from '../queries/results/inventory-alerts.result';

export abstract class AnalyticsQueryService {
  abstract getOverview(
    query: AnalyticsOverviewQuery,
  ): Promise<Result<AnalyticsOverviewResult, QueryError>>;

  abstract getPaymentsTimeSeries(
    query: PaymentsTimeSeriesQuery,
  ): Promise<Result<PaymentsTimeSeriesResult, QueryError>>;

  abstract getTopProducts(
    query: TopProductsQuery,
  ): Promise<Result<TopProductsResult, QueryError>>;

  abstract getInventoryAlerts(
    query: InventoryAlertsQuery,
  ): Promise<Result<InventoryAlertsResult, QueryError>>;
}
