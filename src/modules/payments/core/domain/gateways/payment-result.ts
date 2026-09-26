// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/payments/core/domain/gateways/payment-result.ts
import { PaymentStatusType } from '../value-objects/payment-status';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: PaymentStatusType;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  status: PaymentStatusType;
}
