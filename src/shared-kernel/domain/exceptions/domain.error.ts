import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { ErrorKind } from './error-kind';

export class DomainError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        kind: ErrorKind.INVALID,
        code: ErrorCode.DOMAIN_ERROR,
        retryable: false,
      },
      { ...options, retryable: false },
    );
  }
}
