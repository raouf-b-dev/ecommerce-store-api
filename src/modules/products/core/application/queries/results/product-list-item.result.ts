export interface ProductListItemDTO {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  categoryId: number | null;
  isActive: boolean;
  createdAt: string;
}
