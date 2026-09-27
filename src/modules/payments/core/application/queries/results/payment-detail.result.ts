// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { PaymentListItemDTO } from './payment-list-item.result';

export interface PaymentDetailDTO extends PaymentListItemDTO {
  gatewayPaymentIntentId: string | null;
  failureReason?: string | null;
  metadata?: Record<string, any> | null;
  updatedAt: string;
}

export type PaymentDetailResult = PaymentDetailDTO;
