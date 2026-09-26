// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

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
