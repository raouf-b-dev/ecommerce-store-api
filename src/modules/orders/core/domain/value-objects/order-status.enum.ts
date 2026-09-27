// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export enum OrderStatus {
  // Payment Phase
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_FAILED = 'payment_failed',

  // Confirmation & Fulfillment Phase
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',

  // Terminal States
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
