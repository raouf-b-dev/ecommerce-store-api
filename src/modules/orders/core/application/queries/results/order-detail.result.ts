// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  totalPrice: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDetailResult = OrderDetailDTO;
