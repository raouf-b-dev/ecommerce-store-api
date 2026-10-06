import { ErrorCode } from './error-code';

export abstract class AppError extends Error {
  public readonly timestamp: Date;
  public readonly cause?: Error;
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly retryable: boolean;

  protected constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    cause?: Error,
    retryable: boolean = true,
  ) {
    super(message);
    this.name = new.target.name;
    this.timestamp = new Date();
    this.statusCode = statusCode;
    this.code = code;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
    this.retryable = retryable;
  }
}
