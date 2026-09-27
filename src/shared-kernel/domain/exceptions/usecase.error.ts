// core/errors/usecase.error.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class UseCaseError extends AppError {
  constructor(message: string, cause?: Error, status?: HttpStatus) {
    super(
      message,
      status ?? HttpStatus.UNPROCESSABLE_ENTITY,
      'USECASE_ERROR',
      cause,
      false,
    );
  }
}
