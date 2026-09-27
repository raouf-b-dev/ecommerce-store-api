// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

// src/modules/carts/domain/interfaces/cart.interface.ts

import { ICartItem } from './cart-item.interface';

export interface ICart {
  id: number | null;
  userId: number;
  items: ICartItem[];
  itemCount: number;
  totalAmount: number;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
}
