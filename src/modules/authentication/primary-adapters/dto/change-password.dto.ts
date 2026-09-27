// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecurePass123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
