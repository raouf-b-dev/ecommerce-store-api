// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';

export interface CreatePaymentIntentCommand {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  userId: number;
  metadata?: Record<string, any>;
  callerContext?: CallerContext | null;
}
