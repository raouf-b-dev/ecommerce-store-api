// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface RemoveCartItemCommand {
  cartId?: number;
  productId: number;
  callerContext?: CallerContext | null;
}
