// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

// src/modules/orders/application/dtos/order-item-response.dto.ts
export class OrderItemResponseDto {
  id!: string;
  productId!: string;
  productName?: string;
  unitPrice!: number;
  quantity!: number;
  lineTotal!: number;
}
