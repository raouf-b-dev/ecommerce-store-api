// core/errors/usecase.error.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class UseCaseError extends AppError {
  constructor(message: string, cause?: Error) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY, // Use case errors are business logic failures
      'USECASE_ERROR',
      cause,
    );
  }
}
