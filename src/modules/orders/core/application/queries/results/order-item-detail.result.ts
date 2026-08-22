export interface OrderItemDetailDTO {
  productId: number;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export type OrderItemDetailResult = OrderItemDetailDTO;
