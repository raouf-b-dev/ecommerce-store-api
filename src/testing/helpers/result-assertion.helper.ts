// src/testing/helpers/result-assertion.helper.ts
import { AppError } from '../../shared-kernel/errors/app.error';
import { DomainError } from '../../shared-kernel/errors/domain.error';
import { RepositoryError } from '../../shared-kernel/errors/repository.error';
import { UseCaseError } from '../../shared-kernel/errors/usecase.error';

type ErrorConstructor =
  | typeof RepositoryError
  | typeof UseCaseError
  | typeof DomainError;

export class ResultAssertionHelper {
  static assertResultSuccess<T>(
    result: any,
  ): asserts result is { isSuccess: true; value: T } {
    expect(result.isSuccess).toBe(true);
  }

  static assertResultFailure(
    result: any,
    expectedMessage?: string,
    expectedErrorType?: ErrorConstructor,
    cause?: Error,
  ): void {
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeDefined();

    if (expectedMessage) {
      expect(result.error.message).toContain(expectedMessage);
    }

    if (expectedErrorType) {
      expect(result.error).toBeInstanceOf(expectedErrorType);
    }
    if (cause) {
      expect(result.error.cause).toBe(cause);
    }
  }

  static assertResultFailureWithError(
    result: any,
    expectedError: AppError,
  ): void {
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeDefined();
    expect(result.error).toEqual(expectedError);
  }
}
