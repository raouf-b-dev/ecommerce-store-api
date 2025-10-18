// src/testing/helpers/result-assertion.helper.ts
import { AppError } from '../../core/errors/app.error';
import { ControllerError } from '../../core/errors/controller.error';
import { DomainError } from '../../core/errors/domain.error';
import { RepositoryError } from '../../core/errors/repository.error';
import { UseCaseError } from '../../core/errors/usecase.error';

type ErrorConstructor =
  | typeof RepositoryError
  | typeof UseCaseError
  | typeof DomainError
  | typeof ControllerError;

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
