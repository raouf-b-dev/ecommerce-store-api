// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface TopProductItem {
  productId: number;
  name: string;
  sku: string | null;
  unitsSold: number;
  lineRevenue: number;
}

export interface TopProductsResult {
  timezone: 'UTC';
  from: string;
  to: string;
  items: TopProductItem[];
}
