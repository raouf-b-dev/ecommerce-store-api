// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface AddCartItemCommand {
  cartId: number;
  productId: number;
  quantity: number;
  callerContext: CallerContext | null;
}
