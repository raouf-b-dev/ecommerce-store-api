// src/modules/carts/domain/interfaces/cart.interface.ts

import { ICartItem } from './cart-item.interface';

export interface ICart {
  id: number | null;
  customerId: number | null;
  sessionId: number | null;
  items: ICartItem[];
  itemCount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
