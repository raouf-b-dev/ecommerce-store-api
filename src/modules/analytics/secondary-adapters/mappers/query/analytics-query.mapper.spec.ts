import { AnalyticsQueryMapper } from './analytics-query.mapper';
import type {
  RawAnalyticsAlertRow,
  RawAnalyticsAttentionRow,
  RawAnalyticsRevenueAggRow,
  RawAnalyticsSeriesRow,
  RawAnalyticsTopProductRow,
} from '../../dto/raw-analytics-query-row.interface';
describe('AnalyticsQueryMapper', () => {
  describe('money helpers', () => {
    it('computeAov returns 0 when paidOrderCount is 0', () => {
      expect(AnalyticsQueryMapper.computeAov(100, 0)).toBe(0);
    });

    it('computeAov divides net by paid count', () => {
      expect(AnalyticsQueryMapper.computeAov(100, 4)).toBe(25);
    });
  });

  describe('toKpiSnapshot', () => {
    it('maps revenue and order count rows', () => {
      const revenue: RawAnalyticsRevenueAggRow = {
        gross: '150.5',
        refunded: '20',
        paid_count: '2',
        currency: 'USD',
      };
      const snapshot = AnalyticsQueryMapper.toKpiSnapshot(revenue, {
        count: '5',
      });
      expect(snapshot).toEqual({
        netRevenue: 130.5,
        grossRevenue: 150.5,
        refundedAmount: 20,
        ordersCount: 5,
        paidOrderCount: 2,
        aov: 65.25,
        currency: 'USD',
      });
    });
  });

  describe('toAttentionCounts', () => {
    it('fills known statuses and drops zeros', () => {
      const rows: RawAnalyticsAttentionRow[] = [
        { status: 'pending_payment', count: 2 },
        { status: 'confirmed', count: 0 },
      ];
      expect(AnalyticsQueryMapper.toAttentionCounts(rows)).toEqual([
        { status: 'pending_payment', count: 2 },
      ]);
    });
  });

  describe('toPaymentsTimeSeriesResult', () => {
    it('zero-fills missing day buckets', () => {
      const rows: RawAnalyticsSeriesRow[] = [
        {
          bucket_start: '2026-08-02T00:00:00.000Z',
          gross: 25,
          refunded: 0,
          captured_count: 1,
          currency: 'USD',
        },
      ];
      const result = AnalyticsQueryMapper.toPaymentsTimeSeriesResult({
        from: new Date('2026-08-01T00:00:00.000Z'),
        to: new Date('2026-08-03T23:59:59.999Z'),
        bucket: 'day',
        rows,
      });
      expect(result.buckets).toHaveLength(3);
      expect(result.buckets[0].netAmount).toBe(0);
      expect(result.buckets[1]).toMatchObject({
        bucketStart: '2026-08-02T00:00:00.000Z',
        netAmount: 25,
        capturedCount: 1,
      });
      expect(result.buckets[2].netAmount).toBe(0);
    });
  });

  describe('toTopProductsResult', () => {
    it('maps product rows', () => {
      const rows: RawAnalyticsTopProductRow[] = [
        {
          product_id: 9,
          name: 'Mat',
          sku: 'SPOR-1',
          units_sold: '3',
          line_revenue: '89.97',
        },
      ];
      const result = AnalyticsQueryMapper.toTopProductsResult({
        from: new Date('2026-08-01T00:00:00.000Z'),
        to: new Date('2026-08-31T00:00:00.000Z'),
        rows,
      });
      expect(result.items[0]).toEqual({
        productId: 9,
        name: 'Mat',
        sku: 'SPOR-1',
        unitsSold: 3,
        lineRevenue: 89.97,
      });
    });
  });

  describe('toInventoryAlertsResult', () => {
    it('maps alert rows', () => {
      const rows: RawAnalyticsAlertRow[] = [
        {
          product_id: 1,
          product_title: 'Socks',
          sku: 'CLOT-1',
          available_quantity: 2,
          low_stock_threshold: 5,
        },
      ];
      expect(
        AnalyticsQueryMapper.toInventoryAlertsResult(rows).items[0],
      ).toEqual({
        productId: 1,
        productTitle: 'Socks',
        sku: 'CLOT-1',
        availableQuantity: 2,
        lowStockThreshold: 5,
      });
    });
  });
});
