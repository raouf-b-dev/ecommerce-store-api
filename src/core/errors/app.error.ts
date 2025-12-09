// core/errors/app.error.ts
import { HttpStatus } from '@nestjs/common';

export abstract class AppError extends Error {
  public readonly timestamp: Date;
  public readonly cause?: Error;
  public readonly statusCode: HttpStatus;
  public readonly code: string;
  public readonly retryable: boolean;

  protected constructor(
    message: string,
    statusCode: HttpStatus,
    code: string,
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
