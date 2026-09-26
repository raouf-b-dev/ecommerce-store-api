// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface CartItemPresentationDTO {
  id: number;
  productId: number;
  productName: string;
  price: number;
  currency: string;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}

export interface CartPresentationDTO {
  id: number;
  userId: number;
  items: CartItemPresentationDTO[];
  itemCount: number;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
}
