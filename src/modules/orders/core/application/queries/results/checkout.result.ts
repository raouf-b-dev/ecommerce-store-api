// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { OrderStatus } from '../../../domain/value-objects/order-status';

export interface CheckoutResult {
  orderId: number;
  jobId: string;
  status: OrderStatus;
  message: string;
}
