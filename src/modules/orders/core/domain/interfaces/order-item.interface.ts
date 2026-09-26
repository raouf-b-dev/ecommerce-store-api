// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface IOrderItem {
  id: number | null;
  productId: number;
  productName: string;
  sku?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
