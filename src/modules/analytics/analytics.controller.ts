import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { GetAnalyticsOverviewUseCase } from './core/application/usecases/get-overview/get-analytics-overview.usecase';
import { GetPaymentsTimeSeriesUseCase } from './core/application/usecases/get-payments-time-series/get-payments-time-series.usecase';
import { GetTopProductsUseCase } from './core/application/usecases/get-top-products/get-top-products.usecase';
import { GetInventoryAlertsUseCase } from './core/application/usecases/get-inventory-alerts/get-inventory-alerts.usecase';
import { AnalyticsPeriodQueryDto } from './primary-adapters/dto/analytics-period-query.dto';
import { PaymentsTimeSeriesQueryDto } from './primary-adapters/dto/payments-time-series-query.dto';
import { TopProductsQueryDto } from './primary-adapters/dto/top-products-query.dto';
import { InventoryAlertsQueryDto } from './primary-adapters/dto/inventory-alerts-query.dto';
import { AnalyticsOverviewResponseDto } from './primary-adapters/dto/analytics-overview-response.dto';
import { PaymentsTimeSeriesResponseDto } from './primary-adapters/dto/payments-time-series-response.dto';
import { TopProductsResponseDto } from './primary-adapters/dto/top-products-response.dto';
import { InventoryAlertsResponseDto } from './primary-adapters/dto/inventory-alerts-response.dto';
import { parseAnalyticsPeriod } from './core/application/services/analytics-period.parser';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(
    private readonly getOverviewUseCase: GetAnalyticsOverviewUseCase,
    private readonly getPaymentsTimeSeriesUseCase: GetPaymentsTimeSeriesUseCase,
    private readonly getTopProductsUseCase: GetTopProductsUseCase,
    private readonly getInventoryAlertsUseCase: GetInventoryAlertsUseCase,
  ) {}

  @Get('overview')
  @RequirePermissions('view_all_orders')
  @ApiOperation({
    summary: 'Operational overview KPIs for a period (UTC)',
    description:
      'Revenue from CAPTURED/COMPLETED/PARTIALLY_REFUNDED/REFUNDED payments (gross, refunded, net, AOV). ' +
      'Orders count by creation time. Attention statuses and low-stock count are current snapshots. ' +
      'Buckets and periods use UTC. Max range 90 days.',
  })
  @ApiResponse({ status: 200, type: AnalyticsOverviewResponseDto })
  async overview(@Query() query: AnalyticsPeriodQueryDto) {
    const { from, to } = parseAnalyticsPeriod(query.from, query.to);
    return this.getOverviewUseCase.execute({ from, to });
  }

  @Get('payments/time-series')
  @RequirePermissions('view_all_payments')
  @ApiOperation({
    summary: 'Zero-filled payments revenue time series (UTC)',
    description:
      'Daily or weekly buckets for successful payments. Missing buckets return zeros. Max range 90 days.',
  })
  @ApiResponse({ status: 200, type: PaymentsTimeSeriesResponseDto })
  async paymentsTimeSeries(@Query() query: PaymentsTimeSeriesQueryDto) {
    const { from, to } = parseAnalyticsPeriod(query.from, query.to);
    return this.getPaymentsTimeSeriesUseCase.execute({
      from,
      to,
      bucket: query.bucket,
    });
  }

  @Get('products/top')
  @RequirePermissions('view_all_orders')
  @ApiOperation({
    summary: 'Top products by line revenue in period',
    description:
      'Aggregates order_items for confirmed/processing/shipped/delivered orders created in range (UTC).',
  })
  @ApiResponse({ status: 200, type: TopProductsResponseDto })
  async topProducts(@Query() query: TopProductsQueryDto) {
    const { from, to } = parseAnalyticsPeriod(query.from, query.to);
    return this.getTopProductsUseCase.execute({
      from,
      to,
      limit: query.limit ?? 5,
    });
  }

  @Get('inventory/alerts')
  @RequirePermissions('view_all_inventory')
  @ApiOperation({
    summary: 'Low-stock inventory alerts',
    description:
      'Rows where availableQuantity <= lowStockThreshold, ordered by available ascending.',
  })
  @ApiResponse({ status: 200, type: InventoryAlertsResponseDto })
  async inventoryAlerts(@Query() query: InventoryAlertsQueryDto) {
    return this.getInventoryAlertsUseCase.execute({
      limit: query.limit ?? 20,
    });
  }
}
