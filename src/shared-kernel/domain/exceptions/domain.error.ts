// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// core/errors/domain.error.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';
export class DomainError extends AppError {
  constructor(message: string, cause?: Error, status?: HttpStatus) {
    super(
      message,
      status ?? HttpStatus.BAD_REQUEST,
      'DOMAIN_ERROR',
      cause,
      false,
    );
  }
}
