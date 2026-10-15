import { AppError } from './app.error';
import { ErrorOptions, resolveErrorArgs } from './error-options';
import { ErrorCode } from './error-code';
import { StatusCode } from './status-code';

export class DomainError extends AppError {
  constructor(message: string, options: ErrorOptions);
  constructor(
    message: string,
    cause?: unknown,
    status?: number,
    code?: ErrorCode,
  );
  constructor(
    message: string,
    causeOrOptions?: unknown,
    status?: number,
    code?: ErrorCode,
  ) {
    const resolved = resolveErrorArgs(causeOrOptions, status, undefined, code);
    super(
      message,
      resolved.status ?? StatusCode.BAD_REQUEST,
      resolved.code ?? ErrorCode.DOMAIN_ERROR,
      resolved.cause,
      false,
    );
  }
}
