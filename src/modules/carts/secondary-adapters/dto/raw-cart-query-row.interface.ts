// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface RawCartQueryRow {
  cartId: number | string;
  userId: number | string;
  cartCreatedAt?: Date | string;
  cartUpdatedAt: Date | string;
  itemId?: number | string | null;
  productId?: number | string | null;
  productName?: string | null;
  price?: number | string | null;
  currency?: string | null;
  quantity?: number | string | null;
  imageUrl?: string | null;
}
