import { AppError } from '../../shared-kernel/domain/exceptions/app.error';
import { DomainError } from '../../shared-kernel/domain/exceptions/domain.error';
import { RepositoryError } from '../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../shared-kernel/domain/result';

type ErrorConstructor =
  typeof RepositoryError | typeof UseCaseError | typeof DomainError;

export class ResultAssertionHelper {
  static assertResultSuccess<T>(
    result: Result<T>,
  ): asserts result is Extract<Result<T>, { isSuccess: true }> {
    expect(result.isSuccess).toBe(true);
  }

  static assertResultFailure(
    result: Result<unknown>,
    expectedMessage?: string,
    expectedErrorType?: ErrorConstructor,
    cause?: Error,
  ): asserts result is Extract<Result<unknown>, { isFailure: true }> {
    expect(result.isFailure).toBe(true);
    if (result.isSuccess) {
      throw new Error('Expected a failure result');
    }
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
    result: Result<unknown>,
    expectedError: AppError,
  ): asserts result is Extract<Result<unknown>, { isFailure: true }> {
    expect(result.isFailure).toBe(true);
    if (result.isSuccess) {
      throw new Error('Expected a failure result');
    }
    expect(result.error).toBeDefined();
    expect(result.error).toEqual(expectedError);
  }
}
