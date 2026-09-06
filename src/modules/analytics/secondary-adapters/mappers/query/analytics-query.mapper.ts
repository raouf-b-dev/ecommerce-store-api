import { ANALYTICS_TIMEZONE } from '../../../core/application/analytics.policy';
import type { AnalyticsBucket } from '../../../core/application/analytics.policy';
import type {
  AnalyticsKpiSnapshot,
  AnalyticsOverviewResult,
  OrderAttentionCount,
} from '../../../core/application/queries/results/analytics-overview.result';
import type {
  PaymentTimeSeriesBucket,
  PaymentsTimeSeriesResult,
} from '../../../core/application/queries/results/payments-time-series.result';
import type { TopProductsResult } from '../../../core/application/queries/results/top-products.result';
import type { InventoryAlertsResult } from '../../../core/application/queries/results/inventory-alerts.result';
import {
  enumerateUtcBuckets,
  truncateUtcBucket,
} from '../../query/analytics-utc-buckets';
import { ATTENTION_ORDER_STATUSES } from '../../query/analytics-query.filters';
import type {
  RawAnalyticsAlertRow,
  RawAnalyticsAttentionRow,
  RawAnalyticsCountRow,
  RawAnalyticsRevenueAggRow,
  RawAnalyticsSeriesRow,
  RawAnalyticsTopProductRow,
} from '../../dto/raw-analytics-query-row.interface';

export class AnalyticsQueryMapper {
  static toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  static roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  static computeAov(netRevenue: number, paidOrderCount: number): number {
    if (paidOrderCount <= 0) {
      return 0;
    }
    return this.roundMoney(netRevenue / paidOrderCount);
  }

  static toIso(date: Date): string {
    return date.toISOString();
  }

  /**
   * node-pg parses `timestamp without time zone` as local wall-clock.
   * Rebuild the UTC bucket key from those Y-M-D components so zero-fill matches SQL date_trunc.
   */
  static pgWallClockBucketKey(
    value: Date | string,
    bucket: AnalyticsBucket,
  ): string {
    if (typeof value === 'string') {
      const datePart = value.slice(0, 10);
      return truncateUtcBucket(
        new Date(`${datePart}T00:00:00.000Z`),
        bucket,
      ).toISOString();
    }
    const asUtcMidnight = new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
    );
    return truncateUtcBucket(asUtcMidnight, bucket).toISOString();
  }

  static toKpiSnapshot(
    revenue: RawAnalyticsRevenueAggRow | undefined,
    orderCountRow: RawAnalyticsCountRow | undefined,
  ): AnalyticsKpiSnapshot {
    const gross = this.roundMoney(this.toNumber(revenue?.gross));
    const refunded = this.roundMoney(this.toNumber(revenue?.refunded));
    const net = this.roundMoney(gross - refunded);
    const paidOrderCount = this.toNumber(revenue?.paid_count);

    return {
      netRevenue: net,
      grossRevenue: gross,
      refundedAmount: refunded,
      ordersCount: this.toNumber(orderCountRow?.count),
      paidOrderCount,
      aov: this.computeAov(net, paidOrderCount),
      currency: revenue?.currency ?? 'USD',
    };
  }

  static toAttentionCounts(
    rows: RawAnalyticsAttentionRow[],
  ): OrderAttentionCount[] {
    const byStatus = new Map(
      rows.map((row) => [row.status, this.toNumber(row.count)]),
    );

    return ATTENTION_ORDER_STATUSES.map((status) => ({
      status,
      count: byStatus.get(status) ?? 0,
    })).filter((item) => item.count > 0);
  }

  static toLowStockCount(rows: RawAnalyticsCountRow[]): number {
    return this.toNumber(rows[0]?.count);
  }

  static toOverviewResult(input: {
    from: Date;
    to: Date;
    current: AnalyticsKpiSnapshot;
    previous: AnalyticsKpiSnapshot;
    ordersNeedingAttention: OrderAttentionCount[];
    lowStockCount: number;
  }): AnalyticsOverviewResult {
    return {
      timezone: ANALYTICS_TIMEZONE,
      from: this.toIso(input.from),
      to: this.toIso(input.to),
      current: input.current,
      previous: input.previous,
      ordersNeedingAttention: input.ordersNeedingAttention,
      lowStockCount: input.lowStockCount,
    };
  }

  static toPaymentsTimeSeriesResult(input: {
    from: Date;
    to: Date;
    bucket: AnalyticsBucket;
    rows: RawAnalyticsSeriesRow[];
  }): PaymentsTimeSeriesResult {
    const byStart = new Map<string, RawAnalyticsSeriesRow>();
    for (const row of input.rows) {
      const key = this.pgWallClockBucketKey(row.bucket_start, input.bucket);
      byStart.set(key, row);
    }

    const currency = input.rows.find((r) => r.currency)?.currency ?? 'USD';

    const buckets: PaymentTimeSeriesBucket[] = enumerateUtcBuckets(
      input.from,
      input.to,
      input.bucket,
    ).map((bucketStart) => {
      const key = bucketStart.toISOString();
      const row = byStart.get(key);
      const gross = this.roundMoney(this.toNumber(row?.gross));
      const refunded = this.roundMoney(this.toNumber(row?.refunded));
      return {
        bucketStart: key,
        grossAmount: gross,
        refundedAmount: refunded,
        netAmount: this.roundMoney(gross - refunded),
        capturedCount: this.toNumber(row?.captured_count),
        currency,
      };
    });

    return {
      timezone: ANALYTICS_TIMEZONE,
      bucket: input.bucket,
      from: this.toIso(input.from),
      to: this.toIso(input.to),
      buckets,
    };
  }

  static toTopProductsResult(input: {
    from: Date;
    to: Date;
    rows: RawAnalyticsTopProductRow[];
  }): TopProductsResult {
    return {
      timezone: ANALYTICS_TIMEZONE,
      from: this.toIso(input.from),
      to: this.toIso(input.to),
      items: input.rows.map((row) => ({
        productId: Number(row.product_id),
        name: row.name,
        sku: row.sku,
        unitsSold: this.toNumber(row.units_sold),
        lineRevenue: this.roundMoney(this.toNumber(row.line_revenue)),
      })),
    };
  }

  static toInventoryAlertsResult(
    rows: RawAnalyticsAlertRow[],
  ): InventoryAlertsResult {
    return {
      items: rows.map((row) => ({
        productId: Number(row.product_id),
        productTitle: row.product_title,
        sku: row.sku,
        availableQuantity: Number(row.available_quantity),
        lowStockThreshold: Number(row.low_stock_threshold),
      })),
    };
  }
}
