// src/modules/carts/domain/interfaces/cart.interface.ts

import { ICartItem } from './cart-item.interface';

export interface ICart {
  id: string;
  customerId: string | null;
  sessionId: string | null;
  items: ICartItem[];
  itemCount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
