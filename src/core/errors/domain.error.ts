// core/errors/domain.error.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from './app.error';
export class DomainError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, HttpStatus.BAD_REQUEST, 'DOMAIN_ERROR', cause);
  }
}
