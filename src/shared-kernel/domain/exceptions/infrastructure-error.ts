import { AppError } from './app.error';
import { ErrorOptions } from './error-options';
import { ErrorCode } from './error-code';
import { ErrorKind } from './error-kind';

export class InfrastructureError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(
      message,
      {
        kind: ErrorKind.INTERNAL,
        code: ErrorCode.INFRASTRUCTURE_ERROR,
        retryable: true,
      },
      options,
    );
  }
}
