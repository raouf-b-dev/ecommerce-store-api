import { AppError } from './app.error';
import { ErrorOptions, resolveErrorArgs } from './error-options';
import { ErrorCode } from './error-code';
import { StatusCode } from './status-code';

export class UseCaseError extends AppError {
  constructor(message: string, options: ErrorOptions);
  constructor(
    message: string,
    cause?: unknown,
    status?: number,
    retryable?: boolean,
    code?: ErrorCode,
  );
  constructor(
    message: string,
    causeOrOptions?: unknown,
    status?: number,
    retryable?: boolean,
    code?: ErrorCode,
  ) {
    const resolved = resolveErrorArgs(causeOrOptions, status, retryable, code);
    super(
      message,
      resolved.status ?? StatusCode.UNPROCESSABLE_ENTITY,
      resolved.code ?? ErrorCode.USECASE_ERROR,
      resolved.cause,
      resolved.retryable ?? false,
    );
  }
}
