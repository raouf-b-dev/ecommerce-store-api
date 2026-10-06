export interface RawCartQueryRow {
  cartId: number;
  userId: number;
  cartCreatedAt?: Date | string;
  cartUpdatedAt: Date | string;
  itemId?: number | null;
  productId?: number | null;
  productName?: string | null;
  price?: number | null;
  currency?: string | null;
  quantity?: number | null;
  imageUrl?: string | null;
}
