import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { StatusCode } from './status-code';

export class ServiceError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        status: StatusCode.UNPROCESSABLE_ENTITY,
        code: ErrorCode.SERVICE_ERROR,
        retryable: false,
      },
      { ...options, retryable: false },
    );
  }
}
