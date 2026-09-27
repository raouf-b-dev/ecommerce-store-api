import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsQueryService } from './core/application/ports/analytics-query.service';
import { PostgresAnalyticsQueryAdapter } from './secondary-adapters/query/postgres-analytics-query.adapter';
import { GetAnalyticsOverviewUseCase } from './core/application/usecases/get-overview/get-analytics-overview.usecase';
import { GetPaymentsTimeSeriesUseCase } from './core/application/usecases/get-payments-time-series/get-payments-time-series.usecase';
import { GetTopProductsUseCase } from './core/application/usecases/get-top-products/get-top-products.usecase';
import { GetInventoryAlertsUseCase } from './core/application/usecases/get-inventory-alerts/get-inventory-alerts.usecase';

@Module({
  controllers: [AnalyticsController],
  providers: [
    {
      provide: AnalyticsQueryService,
      useClass: PostgresAnalyticsQueryAdapter,
    },
    GetAnalyticsOverviewUseCase,
    GetPaymentsTimeSeriesUseCase,
    GetTopProductsUseCase,
    GetInventoryAlertsUseCase,
  ],
  exports: [AnalyticsQueryService],
})
export class AnalyticsModule {}
