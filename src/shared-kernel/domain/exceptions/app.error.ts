import { ErrorCode } from './error-code';
import { ErrorOptions } from './error-options';
import { toOptionalError } from './to-optional-error';

export abstract class AppError extends Error {
  public readonly timestamp: Date;
  public readonly cause?: Error;
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly retryable: boolean;

  protected constructor(
    message: string,
    defaults: { status: number; code: ErrorCode; retryable: boolean },
    options: ErrorOptions = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.timestamp = new Date();
    this.statusCode = options.status ?? defaults.status;
    this.code = options.code ?? defaults.code;
    this.cause = toOptionalError(options.cause);
    this.retryable = options.retryable ?? defaults.retryable;
    Error.captureStackTrace(this, this.constructor);
  }
}
