import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { StatusCode } from './status-code';

export class DomainError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        status: StatusCode.BAD_REQUEST,
        code: ErrorCode.DOMAIN_ERROR,
        retryable: false,
      },
      { ...options, retryable: false },
    );
  }
}
