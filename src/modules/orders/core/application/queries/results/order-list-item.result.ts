// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
