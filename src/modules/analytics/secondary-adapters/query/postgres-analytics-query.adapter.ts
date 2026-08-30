import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { AnalyticsQueryService } from '../../core/application/ports/analytics-query.service';
import type { AnalyticsOverviewQuery } from '../../core/application/queries/analytics-overview.query';
import type { PaymentsTimeSeriesQuery } from '../../core/application/queries/payments-time-series.query';
import type { TopProductsQuery } from '../../core/application/queries/top-products.query';
import type { InventoryAlertsQuery } from '../../core/application/queries/inventory-alerts.query';
import type {
  AnalyticsKpiSnapshot,
  AnalyticsOverviewResult,
  OrderAttentionCount,
} from '../../core/application/queries/results/analytics-overview.result';
import type { PaymentsTimeSeriesResult } from '../../core/application/queries/results/payments-time-series.result';
import type { TopProductsResult } from '../../core/application/queries/results/top-products.result';
import type { InventoryAlertsResult } from '../../core/application/queries/results/inventory-alerts.result';
import {
  ANALYTICS_STATEMENT_TIMEOUT_MS,
  ATTENTION_ORDER_STATUSES,
  REVENUE_PAYMENT_STATUSES,
  TOP_PRODUCT_ORDER_STATUSES,
} from './analytics-query.filters';
import { AnalyticsQueryMapper } from '../mappers/query/analytics-query.mapper';
import type {
  RawAnalyticsAlertRow,
  RawAnalyticsAttentionRow,
  RawAnalyticsCountRow,
  RawAnalyticsRevenueAggRow,
  RawAnalyticsSeriesRow,
  RawAnalyticsTopProductRow,
} from '../dto/raw-analytics-query-row.interface';

@Injectable()
export class PostgresAnalyticsQueryAdapter implements AnalyticsQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverview(
    query: AnalyticsOverviewQuery,
  ): Promise<Result<AnalyticsOverviewResult, QueryError>> {
    try {
      return await this.withStatementTimeout(async (queryFn) => {
        const [current, previousKpis, attention, lowStockCount] =
          await Promise.all([
            this.loadKpis(queryFn, query.from, query.to),
            this.loadKpis(queryFn, query.previousFrom, query.previousTo),
            this.loadAttention(queryFn),
            this.loadLowStockCount(queryFn),
          ]);

        return Result.success(
          AnalyticsQueryMapper.toOverviewResult({
            from: query.from,
            to: query.to,
            current,
            previous: previousKpis,
            ordersNeedingAttention: attention,
            lowStockCount,
          }),
        );
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        'Failed to load analytics overview',
        error,
      );
    }
  }

  async getPaymentsTimeSeries(
    query: PaymentsTimeSeriesQuery,
  ): Promise<Result<PaymentsTimeSeriesResult, QueryError>> {
    try {
      return await this.withStatementTimeout(async (queryFn) => {
        // Whitelist only — never interpolate raw client strings into date_trunc.
        const bucketExpr =
          query.bucket === 'week'
            ? `date_trunc('week', COALESCE(p.completed_at, p.created_at))`
            : `date_trunc('day', COALESCE(p.completed_at, p.created_at))`;
        const rows = await queryFn<RawAnalyticsSeriesRow[]>(
          `
          SELECT
            ${bucketExpr} AS bucket_start,
            COALESCE(SUM(p.amount), 0) AS gross,
            COALESCE(SUM(p.refunded_amount), 0) AS refunded,
            COUNT(*)::int AS captured_count,
            COALESCE(MIN(p.currency), 'USD') AS currency
          FROM payments p
          WHERE p.status = ANY($1::varchar[])
            AND COALESCE(p.completed_at, p.created_at) >= $2
            AND COALESCE(p.completed_at, p.created_at) <= $3
          GROUP BY 1
          ORDER BY 1 ASC
          `,
          [[...REVENUE_PAYMENT_STATUSES], query.from, query.to],
        );

        return Result.success(
          AnalyticsQueryMapper.toPaymentsTimeSeriesResult({
            from: query.from,
            to: query.to,
            bucket: query.bucket,
            rows,
          }),
        );
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        'Failed to load payments time series',
        error,
      );
    }
  }

  async getTopProducts(
    query: TopProductsQuery,
  ): Promise<Result<TopProductsResult, QueryError>> {
    try {
      return await this.withStatementTimeout(async (queryFn) => {
        const rows = await queryFn<RawAnalyticsTopProductRow[]>(
          `
          SELECT
            oi.product_id AS product_id,
            COALESCE(NULLIF(MAX(oi.product_name), ''), 'Unknown') AS name,
            MAX(oi.sku) AS sku,
            SUM(oi.quantity)::int AS units_sold,
            COALESCE(SUM(oi."lineTotal"), 0) AS line_revenue
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE o.status = ANY($1::varchar[])
            AND o."createdAt" >= $2
            AND o."createdAt" <= $3
          GROUP BY oi.product_id
          ORDER BY SUM(oi."lineTotal") DESC, SUM(oi.quantity) DESC
          LIMIT $4
          `,
          [[...TOP_PRODUCT_ORDER_STATUSES], query.from, query.to, query.limit],
        );

        return Result.success(
          AnalyticsQueryMapper.toTopProductsResult({
            from: query.from,
            to: query.to,
            rows,
          }),
        );
      });
    } catch (error) {
      return ErrorFactory.QueryError('Failed to load top products', error);
    }
  }

  async getInventoryAlerts(
    query: InventoryAlertsQuery,
  ): Promise<Result<InventoryAlertsResult, QueryError>> {
    try {
      return await this.withStatementTimeout(async (queryFn) => {
        const rows = await queryFn<RawAnalyticsAlertRow[]>(
          `
          SELECT
            inventory.product_id AS product_id,
            COALESCE(product.name, '') AS product_title,
            product.sku AS sku,
            inventory."availableQuantity" AS available_quantity,
            inventory."lowStockThreshold" AS low_stock_threshold
          FROM inventory
          LEFT JOIN products product ON product.id = inventory.product_id
          WHERE inventory."availableQuantity" <= inventory."lowStockThreshold"
          ORDER BY inventory."availableQuantity" ASC
          LIMIT $1
          `,
          [query.limit],
        );

        return Result.success(
          AnalyticsQueryMapper.toInventoryAlertsResult(rows),
        );
      });
    } catch (error) {
      return ErrorFactory.QueryError('Failed to load inventory alerts', error);
    }
  }

  private async loadKpis(
    queryFn: <T>(sql: string, params?: unknown[]) => Promise<T>,
    from: Date,
    to: Date,
  ): Promise<AnalyticsKpiSnapshot> {
    const [revenueRows, orderCountRows] = await Promise.all([
      queryFn<RawAnalyticsRevenueAggRow[]>(
        `
        SELECT
          COALESCE(SUM(p.amount), 0) AS gross,
          COALESCE(SUM(p.refunded_amount), 0) AS refunded,
          COUNT(*)::int AS paid_count,
          COALESCE(MIN(p.currency), 'USD') AS currency
        FROM payments p
        WHERE p.status = ANY($1::varchar[])
          AND COALESCE(p.completed_at, p.created_at) >= $2
          AND COALESCE(p.completed_at, p.created_at) <= $3
        `,
        [[...REVENUE_PAYMENT_STATUSES], from, to],
      ),
      queryFn<RawAnalyticsCountRow[]>(
        `
        SELECT COUNT(*)::int AS count
        FROM orders o
        WHERE o."createdAt" >= $1
          AND o."createdAt" <= $2
        `,
        [from, to],
      ),
    ]);

    return AnalyticsQueryMapper.toKpiSnapshot(
      revenueRows[0],
      orderCountRows[0],
    );
  }

  private async loadAttention(
    queryFn: <T>(sql: string, params?: unknown[]) => Promise<T>,
  ): Promise<OrderAttentionCount[]> {
    const rows = await queryFn<RawAnalyticsAttentionRow[]>(
      `
      SELECT o.status AS status, COUNT(*)::int AS count
      FROM orders o
      WHERE o.status = ANY($1::varchar[])
      GROUP BY o.status
      `,
      [[...ATTENTION_ORDER_STATUSES]],
    );

    return AnalyticsQueryMapper.toAttentionCounts(rows);
  }

  private async loadLowStockCount(
    queryFn: <T>(sql: string, params?: unknown[]) => Promise<T>,
  ): Promise<number> {
    const rows = await queryFn<RawAnalyticsCountRow[]>(
      `
      SELECT COUNT(*)::int AS count
      FROM inventory
      WHERE "availableQuantity" <= "lowStockThreshold"
      `,
    );
    return AnalyticsQueryMapper.toLowStockCount(rows);
  }

  private async withStatementTimeout<T>(
    work: (
      queryFn: <R>(sql: string, params?: unknown[]) => Promise<R>,
    ) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `SET LOCAL statement_timeout = '${ANALYTICS_STATEMENT_TIMEOUT_MS}'`,
      );
      const queryFn = async <R>(
        sql: string,
        params: unknown[] = [],
      ): Promise<R> => {
        return (await queryRunner.query(sql, params)) as R;
      };
      const result = await work(queryFn);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
