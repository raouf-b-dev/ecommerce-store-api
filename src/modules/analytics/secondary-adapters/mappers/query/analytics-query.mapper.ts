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
import { Currency } from '../../../../../shared-kernel/domain/value-objects/currency';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { majorUnitsFromSignedMinor } from '../../../../../shared-kernel/domain/value-objects/money-decimal';

export class AnalyticsQueryMapper {
  static toNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  static computeAov(
    netMinor: number,
    paidOrderCount: number,
    currency: string,
  ): number {
    if (paidOrderCount <= 0) {
      return 0;
    }
    const currencyResult = Currency.create(currency);
    if (currencyResult.isFailure) {
      throw currencyResult.error;
    }
    const aovMinor = Math.round(netMinor / paidOrderCount);
    return majorUnitsFromSignedMinor(aovMinor, currencyResult.value.exponent);
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
    currency: string,
  ): AnalyticsKpiSnapshot {
    const grossMoneyResult = Money.fromDecimal(
      this.toNumber(revenue?.gross),
      currency,
    );
    if (grossMoneyResult.isFailure) {
      throw grossMoneyResult.error;
    }
    const refundedMoneyResult = Money.fromDecimal(
      this.toNumber(revenue?.refunded),
      currency,
    );
    if (refundedMoneyResult.isFailure) {
      throw refundedMoneyResult.error;
    }
    const currencyResult = Currency.create(currency);
    if (currencyResult.isFailure) {
      throw currencyResult.error;
    }
    const gross = grossMoneyResult.value.toMajorUnits();
    const refunded = refundedMoneyResult.value.toMajorUnits();
    const netMinor =
      grossMoneyResult.value.amount - refundedMoneyResult.value.amount;
    const net = majorUnitsFromSignedMinor(
      netMinor,
      currencyResult.value.exponent,
    );
    const paidOrderCount = this.toNumber(revenue?.paid_count);

    return {
      netRevenue: net,
      grossRevenue: gross,
      refundedAmount: refunded,
      ordersCount: this.toNumber(orderCountRow?.count),
      paidOrderCount,
      aov: this.computeAov(netMinor, paidOrderCount, currency),
      currency,
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
    currency: string;
  }): PaymentsTimeSeriesResult {
    const byStart = new Map<string, RawAnalyticsSeriesRow>();
    for (const row of input.rows) {
      const key = this.pgWallClockBucketKey(row.bucket_start, input.bucket);
      byStart.set(key, row);
    }

    const currency = input.currency;
    const seriesCurrencyResult = Currency.create(currency);
    if (seriesCurrencyResult.isFailure) {
      throw seriesCurrencyResult.error;
    }
    const seriesExponent = seriesCurrencyResult.value.exponent;

    const buckets: PaymentTimeSeriesBucket[] = enumerateUtcBuckets(
      input.from,
      input.to,
      input.bucket,
    ).map((bucketStart) => {
      const key = bucketStart.toISOString();
      const row = byStart.get(key);
      const grossMoneyResult = Money.fromDecimal(
        this.toNumber(row?.gross),
        currency,
      );
      if (grossMoneyResult.isFailure) {
        throw grossMoneyResult.error;
      }
      const refundedMoneyResult = Money.fromDecimal(
        this.toNumber(row?.refunded),
        currency,
      );
      if (refundedMoneyResult.isFailure) {
        throw refundedMoneyResult.error;
      }
      const gross = grossMoneyResult.value.toMajorUnits();
      const refunded = refundedMoneyResult.value.toMajorUnits();
      const netMinor =
        grossMoneyResult.value.amount - refundedMoneyResult.value.amount;
      const net = majorUnitsFromSignedMinor(netMinor, seriesExponent);
      return {
        bucketStart: key,
        grossAmount: gross,
        refundedAmount: refunded,
        netAmount: net,
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
    currency: string;
  }): TopProductsResult {
    return {
      timezone: ANALYTICS_TIMEZONE,
      from: this.toIso(input.from),
      to: this.toIso(input.to),
      items: input.rows.map((row) => {
        const itemCurrency = row.currency ?? input.currency;
        const lineMoneyResult = Money.fromDecimal(
          this.toNumber(row.line_revenue),
          itemCurrency,
        );
        if (lineMoneyResult.isFailure) {
          throw lineMoneyResult.error;
        }
        return {
          productId: Number(row.product_id),
          name: row.name,
          sku: row.sku,
          unitsSold: this.toNumber(row.units_sold),
          lineRevenue: lineMoneyResult.value.toMajorUnits(),
        };
      }),
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
