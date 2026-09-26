// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ListInventoryQuery {
  page?: number;
  limit?: number;
  productId?: number;
  sku?: string;
  productTitle?: string;
  lowStockOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
