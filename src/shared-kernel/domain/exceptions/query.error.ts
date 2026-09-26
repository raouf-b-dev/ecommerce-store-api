// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class QueryError extends AppError {
  constructor(
    message: string,
    cause?: Error,
    status?: HttpStatus,
    retryable: boolean = true,
  ) {
    super(
      message,
      status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      'QUERY_ERROR',
      cause,
      retryable,
    );
  }
}

export class QueryNotFoundError extends QueryError {
  constructor(message: string, cause?: Error) {
    super(message, cause, HttpStatus.NOT_FOUND, false);
  }
}
