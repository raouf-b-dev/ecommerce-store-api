// src/modules/orders/domain/interfaces/IOrderItem.ts
export interface IOrderItem {
  id: string;
  productId: string;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
