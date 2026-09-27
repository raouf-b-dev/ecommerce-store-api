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
