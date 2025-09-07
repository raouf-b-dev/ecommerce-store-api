import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';

export class RepositoryError extends AppError {
  constructor(message: string, cause?: Error) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR, // Repository errors are server errors
      'REPOSITORY_ERROR',
      cause,
    );
  }
}
