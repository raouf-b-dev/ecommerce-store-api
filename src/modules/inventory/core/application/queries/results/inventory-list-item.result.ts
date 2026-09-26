// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface InventoryListItemDTO {
  id: number;
  productId: number;
  sku: string;
  productTitle: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  updatedAt: string;
}

export type InventoryListItemResult = InventoryListItemDTO;
