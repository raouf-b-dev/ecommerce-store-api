// core/errors/error.factory.ts
import { DomainError } from './domain.error';
import { UseCaseError } from './usecase.error';
import { RepositoryError } from './repository.error';
import { ControllerError } from './controller.error';
import { Result } from '../domain/result';

function toError(error: unknown): Error | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }

  return new Error('Unknown error occurred');
}

export const ErrorFactory = {
  DomainError: (message: string, cause?: unknown) =>
    Result.failure(new DomainError(message, toError(cause))),
  UseCaseError: (message: string, cause?: unknown) =>
    Result.failure(new UseCaseError(message, toError(cause))),
  RepositoryError: (message: string, cause?: unknown) =>
    Result.failure(new RepositoryError(message, toError(cause))),
  ControllerError: (message: string, cause?: unknown) =>
    Result.failure(new ControllerError(message, toError(cause))),
};
