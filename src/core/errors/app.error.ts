// core/errors/app.error.ts

export abstract class AppError extends Error {
  public readonly name: string;
  public readonly timestamp: Date;
  public readonly cause?: Error;

  protected constructor(message: string, cause?: Error) {
    super(message);
    this.name = new.target.name;
    this.timestamp = new Date();
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}
