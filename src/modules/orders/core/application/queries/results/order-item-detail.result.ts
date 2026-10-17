export interface OrderItemDetailDTO {
  productId: number;
  sku: string | null;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}

export type OrderItemDetailResult = OrderItemDetailDTO;
