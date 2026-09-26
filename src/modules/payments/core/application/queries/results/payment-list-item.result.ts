// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface PaymentListItemDTO {
  id: number;
  orderId: number;
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
}

export type PaymentListItemResult = PaymentListItemDTO;
