import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { StatusCode } from './status-code';

export class QueryError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        status: StatusCode.INTERNAL_SERVER_ERROR,
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
      status: StatusCode.NOT_FOUND,
      retryable: false,
    });
  }
}
