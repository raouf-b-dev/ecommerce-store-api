// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { OrderStatus } from '../../../domain/value-objects/order-status';

export interface CheckoutResult {
  orderId: number;
  jobId: string;
  status: OrderStatus;
  message: string;
}
