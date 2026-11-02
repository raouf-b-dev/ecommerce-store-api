import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { ErrorKind } from './error-kind';

export class QueryError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        kind: ErrorKind.INTERNAL,
        code: ErrorCode.QUERY_ERROR,
        retryable: true,
      },
      options,
    );
  }
}

export class QueryNotFoundError extends QueryError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      kind: ErrorKind.NOT_FOUND,
      retryable: false,
    });
  }
}
