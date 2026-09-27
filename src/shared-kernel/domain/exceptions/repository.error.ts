// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class RepositoryError extends AppError {
  constructor(
    message: string,
    cause?: Error,
    status?: HttpStatus,
    retryable?: boolean,
  ) {
    super(
      message,
      status ?? HttpStatus.INTERNAL_SERVER_ERROR, // Repository errors are server errors
      'REPOSITORY_ERROR',
      cause,
      retryable,
    );
  }
}
