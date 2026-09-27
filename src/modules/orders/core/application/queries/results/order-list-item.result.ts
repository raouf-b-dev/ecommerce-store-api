export interface OrderListItemDTO {
  id: number;
  orderNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  createdAt: Date;
}

export type OrderListItemResult = OrderListItemDTO;
