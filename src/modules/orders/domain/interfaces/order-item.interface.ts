// src/modules/orders/domain/interfaces/IOrderItem.ts
export interface IOrderItem {
  id: number | null;
  productId: number;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
