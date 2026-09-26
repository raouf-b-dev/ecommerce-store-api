// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { StockAdjustmentType } from '../../domain/value-objects/stock-adjustment-type';

export interface AdjustStockCommand {
  productId: number;
  quantity: number;
  type: StockAdjustmentType;
  reason?: string;
}
