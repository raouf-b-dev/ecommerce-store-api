// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiProperty } from '@nestjs/swagger';

export class CheckStockResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  isAvailable!: boolean;

  @ApiProperty({ type: Number, example: 25 })
  availableQuantity!: number;

  @ApiProperty({ type: Number, example: 1 })
  requestedQuantity!: number;
}
