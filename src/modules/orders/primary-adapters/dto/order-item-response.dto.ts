// src/modules/orders/application/dtos/order-item-response.dto.ts
export class OrderItemResponseDto {
  id: string;
  productId: string;
  productName?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
