/**
 * Raw SQL row shapes returned by analytics query adapter (node-pg / TypeORM).
 * Coercion to application result DTOs lives in AnalyticsQueryMapper.
 */

export interface RawAnalyticsRevenueAggRow {
  gross: number | null;
  refunded: number | null;
  paid_count: number | null;
  currency: string | null;
}

export interface RawAnalyticsCountRow {
  count: number;
}

export interface RawAnalyticsAttentionRow {
  status: string;
  count: number;
}

export interface RawAnalyticsSeriesRow {
  bucket_start: Date | string;
  gross: number | null;
  refunded: number | null;
  captured_count: number | null;
  currency: string | null;
}

export interface RawAnalyticsTopProductRow {
  product_id: number;
  name: string;
  sku: string | null;
  units_sold: number;
  line_revenue: number;
}

export interface RawAnalyticsAlertRow {
  product_id: number;
  product_title: string;
  sku: string | null;
  available_quantity: number;
  low_stock_threshold: number;
}
