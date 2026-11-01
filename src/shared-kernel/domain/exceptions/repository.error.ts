import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { ErrorKind } from './error-kind';

export class RepositoryError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        kind: ErrorKind.INTERNAL,
        code: ErrorCode.REPOSITORY_ERROR,
        retryable: true,
      },
      options,
    );
  }
}
