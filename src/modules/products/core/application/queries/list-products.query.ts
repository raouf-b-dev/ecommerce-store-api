export interface ListProductsQuery {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'price' | 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
}
