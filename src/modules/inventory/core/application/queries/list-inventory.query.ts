export interface ListInventoryQuery {
  page?: number;
  limit?: number;
  productId?: number;
  sku?: string;
  productTitle?: string;
  lowStockOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
