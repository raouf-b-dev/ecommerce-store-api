// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface UpdateProductCommand {
  id: number;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  sku?: string;
  imageUrl?: string | null;
  categoryId?: number | null;
}
