// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/carts/presentation/dto/add-cart-item.dto.ts
import { IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({
    example: 5,
    description: 'Product ID',
  })
  @IsNumber()
  productId!: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity to add',
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity!: number;
}
