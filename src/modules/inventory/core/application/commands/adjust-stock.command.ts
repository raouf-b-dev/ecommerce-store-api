// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { StockAdjustmentType } from '../../domain/value-objects/stock-adjustment-type';

export interface AdjustStockCommand {
  productId: number;
  quantity: number;
  type: StockAdjustmentType;
  reason?: string;
}
