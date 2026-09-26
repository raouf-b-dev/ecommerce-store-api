// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiProperty } from '@nestjs/swagger';

export class HealthIndicatorResultDto {
  @ApiProperty({ type: String, example: 'up' })
  status!: string;
}

export class HealthCheckResponseDto {
  @ApiProperty({ enum: ['ok', 'error', 'shutting_down'], example: 'ok' })
  status!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { postgres: { status: 'up' } },
  })
  info!: Record<string, { status: string }>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  error!: Record<string, { status: string }>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { postgres: { status: 'up' } },
  })
  details!: Record<string, { status: string }>;
}
