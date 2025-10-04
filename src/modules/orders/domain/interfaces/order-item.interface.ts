// src/modules/orders/domain/interfaces/IOrderItem.ts
export interface IOrderItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
