// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ICartItem {
  id: number | null;
  productId: number;
  productName: string;
  price: number;
  currency: string;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}
