import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { StatusCode } from './status-code';

export class RepositoryError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        status: StatusCode.INTERNAL_SERVER_ERROR,
        code: ErrorCode.REPOSITORY_ERROR,
        retryable: true,
      },
      options,
    );
  }
}
