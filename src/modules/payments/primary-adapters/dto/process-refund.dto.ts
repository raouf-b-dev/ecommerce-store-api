// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/payments/presentation/dto/process-refund.dto.ts
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessRefundDto {
  @ApiProperty({
    example: 99.99,
    description: 'Refund amount',
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    example: 'User  requested cancellation',
    description: 'Reason for refund',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
