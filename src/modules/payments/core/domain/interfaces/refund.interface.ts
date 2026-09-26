// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { RefundStatusType } from '../value-objects/refund-status';

//src\modules\payments\domain\interfaces\refund.interface.ts
export interface IRefund {
  id: number | null;
  paymentId: number;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatusType;
  createdAt: Date;
  updatedAt: Date;
}
