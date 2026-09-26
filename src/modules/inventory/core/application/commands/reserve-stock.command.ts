// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ReserveStockItem {
  productId: number;
  quantity: number;
}

export interface ReserveStockCommand {
  orderId: number;
  items: ReserveStockItem[];
}
