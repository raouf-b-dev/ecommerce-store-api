// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface OrderItemDetailDTO {
  productId: number;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export type OrderItemDetailResult = OrderItemDetailDTO;
