export interface IOrderItem {
  id: number | null;
  productId: number;
  productName: string;
  sku?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
