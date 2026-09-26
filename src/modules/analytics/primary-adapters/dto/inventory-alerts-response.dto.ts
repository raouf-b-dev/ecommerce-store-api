// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryAlertItemDto {
  @ApiProperty({ type: Number, example: 1 })
  productId!: number;

  @ApiProperty({ type: String, example: 'Wireless Headphones' })
  productTitle!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SKU-001' })
  sku!: string | null;

  @ApiProperty({ type: Number, example: 2 })
  availableQuantity!: number;

  @ApiProperty({ type: Number, example: 10 })
  lowStockThreshold!: number;
}

export class InventoryAlertsResponseDto {
  @ApiProperty({ type: [InventoryAlertItemDto] })
  items!: InventoryAlertItemDto[];
}
