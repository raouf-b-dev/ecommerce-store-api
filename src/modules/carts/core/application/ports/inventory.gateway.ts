// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface StockCheckResult {
  isAvailable: boolean;
  availableQuantity: number;
  requestedQuantity: number;
}

export interface CartInventoryGateway {
  checkStock(
    productId: number,
    quantity: number,
  ): Promise<Result<StockCheckResult, InfrastructureError>>;
}
