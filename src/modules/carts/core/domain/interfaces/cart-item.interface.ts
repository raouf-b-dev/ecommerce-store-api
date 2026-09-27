// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

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
