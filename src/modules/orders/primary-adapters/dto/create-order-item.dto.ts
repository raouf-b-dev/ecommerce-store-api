// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 123, description: 'ID of the product' })
  @IsNumber()
  productId!: number;

  @ApiProperty({ example: 'Product Name', description: 'Name of the product' })
  @IsString()
  productName!: string;

  @ApiProperty({ example: 29.99, description: 'Unit price of the product' })
  @IsNumber()
  unitPrice!: number;

  @ApiProperty({ example: 2, description: 'Quantity ordered' })
  @IsNumber()
  @Min(1)
  quantity!: number;
}
