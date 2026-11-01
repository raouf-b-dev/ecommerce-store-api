import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { StatusCode } from './status-code';

export class UseCaseError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        status: StatusCode.UNPROCESSABLE_ENTITY,
        code: ErrorCode.USECASE_ERROR,
        retryable: false,
      },
      options,
    );
  }
}
