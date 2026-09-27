// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface OrderItemDetailDTO {
  productId: number;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export type OrderItemDetailResult = OrderItemDetailDTO;
