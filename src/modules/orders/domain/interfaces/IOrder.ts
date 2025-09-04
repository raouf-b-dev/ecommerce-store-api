// src/modules/orders/domain/interfaces/IOrder.ts
import { OrderStatus } from '../value-objects/order-status';
import { IOrderItem } from './IOrderItem';

export interface IOrder {
  id: string;
  customerId: string;
  items: IOrderItem[];
  status: OrderStatus;
  totalPrice: number;
  createdAt: Date;
  updatedAt?: Date;
}
