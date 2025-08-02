// core/errors/error.factory.ts
import { DomainError } from './domain.error';
import { UseCaseError } from './usecase.error';
import { RepositoryError } from './repository.error';
import { ControllerError } from './controller.error';
import { Result } from '../domain/result';

export const ErrorFactory = {
  DomainError: (message: string, cause?: Error) =>
    Result.failure(new DomainError(message, cause)),
  UseCaseError: (message: string, cause?: Error) =>
    Result.failure(new UseCaseError(message, cause)),
  RepositoryError: (message: string, cause?: Error) =>
    Result.failure(new RepositoryError(message, cause)),
  ControllerError: (message: string, cause?: Error) =>
    Result.failure(new ControllerError(message, cause)),
};
