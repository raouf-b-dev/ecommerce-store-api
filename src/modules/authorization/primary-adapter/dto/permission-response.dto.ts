// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'manage_products' })
  code!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Create, update, and delete products',
  })
  description!: string | null;
}
