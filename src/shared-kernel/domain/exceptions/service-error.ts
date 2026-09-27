// core/errors/usecase.error.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class ServiceError extends AppError {
  constructor(message: string, cause?: Error, status?: HttpStatus) {
    super(
      message,
      status ?? HttpStatus.UNPROCESSABLE_ENTITY,
      'SERVICE_ERROR',
      cause,
      false,
    );
  }
}
