// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface RawPaymentListQueryRow {
  id: number | string;
  orderId: number | string;
  userId: number | string;
  userName: string | null;
  userEmail: string | null;
  amount: number | string;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  gatewayPaymentIntentId?: string | null;
  failureReason?: string | null;
  metadata?: string | Record<string, any> | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
