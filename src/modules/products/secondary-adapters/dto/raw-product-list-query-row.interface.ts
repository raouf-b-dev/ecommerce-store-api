export interface RawProductListQueryRow {
  id: number | string;
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  price: number | string;
  currency: string;
  imageUrl?: string | null;
  categoryId?: number | string | null;
  isActive: boolean | number | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
