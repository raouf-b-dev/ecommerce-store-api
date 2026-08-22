import { OrderItemDetailDTO } from './order-item-detail.result';

export interface OrderDetailDTO {
  id: number;
  orderNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: string;
  shippingAddress: string;
  items: OrderItemDetailDTO[];
  totalAmount: number;
  totalPrice: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDetailResult = OrderDetailDTO;
