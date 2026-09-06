export interface TopProductItem {
  productId: number;
  name: string;
  sku: string | null;
  unitsSold: number;
  lineRevenue: number;
}

export interface TopProductsResult {
  timezone: 'UTC';
  from: string;
  to: string;
  items: TopProductItem[];
}
