export interface RawProductListQueryRow {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
