export interface IProduct {
  id: number | null;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  sku?: string;
  imageUrl?: string | null;
  categoryId?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
