// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface InventoryAlertItem {
  productId: number;
  productTitle: string;
  sku: string | null;
  availableQuantity: number;
  lowStockThreshold: number;
}

export interface InventoryAlertsResult {
  items: InventoryAlertItem[];
}
