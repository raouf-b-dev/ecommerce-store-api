export interface RawCartQueryRow {
  cartId: number | string;
  userId: number | string;
  cartUpdatedAt: Date | string;
  itemId?: number | string | null;
  productId?: number | string | null;
  productName?: string | null;
  price?: number | string | null;
  quantity?: number | string | null;
  imageUrl?: string | null;
}
