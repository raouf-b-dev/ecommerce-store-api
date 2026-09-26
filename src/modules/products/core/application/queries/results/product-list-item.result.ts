// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ProductListItemDTO {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  categoryId: number | null;
  categoryName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
