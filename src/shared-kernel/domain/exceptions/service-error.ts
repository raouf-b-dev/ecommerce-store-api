import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { ErrorKind } from './error-kind';

export class ServiceError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        kind: ErrorKind.RULE_VIOLATION,
        code: ErrorCode.SERVICE_ERROR,
        retryable: false,
      },
      { ...options, retryable: false },
    );
  }
}
