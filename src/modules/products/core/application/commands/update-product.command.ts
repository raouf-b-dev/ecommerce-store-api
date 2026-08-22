export interface UpdateProductCommand {
  id: number;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  sku?: string;
  imageUrl?: string | null;
  categoryId?: number | null;
}
