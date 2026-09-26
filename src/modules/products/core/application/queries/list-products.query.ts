// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ListProductsQuery {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'price' | 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
}
