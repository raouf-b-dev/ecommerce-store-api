/**
 * Raw SQL row shapes returned by analytics query adapter (node-pg / TypeORM).
 * Coercion to application result DTOs lives in AnalyticsQueryMapper.
 */

export interface RawAnalyticsRevenueAggRow {
  gross: string | number | null;
  refunded: string | number | null;
  paid_count: string | number | null;
  currency: string | null;
}

export interface RawAnalyticsCountRow {
  count: string | number;
}

export interface RawAnalyticsAttentionRow {
  status: string;
  count: string | number;
}

export interface RawAnalyticsSeriesRow {
  bucket_start: Date | string;
  gross: string | number | null;
  refunded: string | number | null;
  captured_count: string | number | null;
  currency: string | null;
}

export interface RawAnalyticsTopProductRow {
  product_id: number;
  name: string;
  sku: string | null;
  units_sold: string | number;
  line_revenue: string | number;
}

export interface RawAnalyticsAlertRow {
  product_id: number;
  product_title: string;
  sku: string | null;
  available_quantity: number;
  low_stock_threshold: number;
}
