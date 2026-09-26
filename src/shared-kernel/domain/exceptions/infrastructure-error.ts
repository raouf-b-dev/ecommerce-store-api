// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class InfrastructureError extends AppError {
  constructor(
    message: string,
    cause?: Error,
    status?: HttpStatus,
    retryable?: boolean,
  ) {
    super(
      message,
      status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      'INFRASTRUCTURE_ERROR',
      cause,
      retryable,
    );
  }
}
