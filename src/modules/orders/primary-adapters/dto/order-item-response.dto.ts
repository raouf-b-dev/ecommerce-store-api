// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/orders/application/dtos/order-item-response.dto.ts
export class OrderItemResponseDto {
  id!: string;
  productId!: string;
  productName?: string;
  unitPrice!: number;
  quantity!: number;
  lineTotal!: number;
}
