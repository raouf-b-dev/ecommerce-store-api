// core/domain/result.ts
import { AppError } from '../errors/app.error';

export type Result<T, E extends AppError = AppError> = Success<T> | Failure<E>;

class Success<T> {
  public readonly isSuccess = true;
  public readonly isFailure = false;
  constructor(public readonly value: T) {}
}

class Failure<E extends AppError = AppError> {
  public readonly isSuccess = false;
  public readonly isFailure = true;
  constructor(public readonly error: E) {}
}

export const Result = {
  success: <T>(value: T): Success<T> => new Success(value),
  failure: <E extends AppError>(error: E): Failure<E> => new Failure(error),
};

export function isSuccess<T, E extends AppError>(
  result: Result<T, E>,
): result is Success<T> {
  return result.isSuccess;
}

export function isFailure<T, E extends AppError>(
  result: Result<T, E>,
): result is Failure<E> {
  return result.isFailure;
}
