// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface ProcessRefundCommand {
  paymentId: number;
  amount: number;
  reason?: string;
  callerContext?: CallerContext | null;
}
