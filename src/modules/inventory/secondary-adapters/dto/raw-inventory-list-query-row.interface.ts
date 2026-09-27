// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface RawInventoryListQueryRow {
  id: number | string;
  productId: number | string;
  sku: string | null;
  productTitle: string | null;
  availableQuantity: number | string;
  reservedQuantity: number | string;
  totalQuantity: number | string;
  updatedAt: Date | string;
}
