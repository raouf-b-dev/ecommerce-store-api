// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

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
