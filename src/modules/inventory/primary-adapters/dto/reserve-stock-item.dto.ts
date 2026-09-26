// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/inventory/presentation/dto/reserve-stock-item.dto.ts
import { IsString, IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReserveStockItemDto {
  @ApiProperty({
    example: 'prod-123',
    description: 'Product ID',
  })
  @IsString()
  productId!: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity to reserve',
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity!: number;
}
