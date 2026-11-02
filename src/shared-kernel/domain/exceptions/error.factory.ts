import { DomainError } from './domain.error';
import { UseCaseError } from './usecase.error';
import { RepositoryError } from './repository.error';
import { Failure, Result } from '../result';
import { ServiceError } from './service-error';
import { InfrastructureError } from './infrastructure-error';
import { QueryError, QueryNotFoundError } from './query.error';
import { ErrorOptions, isRetryableErrorKind } from './error-options';

function domainError(
  message: string,
  options: ErrorOptions = {},
): Failure<DomainError> {
  return Result.failure(new DomainError(message, options));
}

function useCaseError(
  message: string,
  options: ErrorOptions = {},
): Failure<UseCaseError> {
  return Result.failure(new UseCaseError(message, options));
}

function serviceError(
  message: string,
  options: ErrorOptions = {},
): Failure<ServiceError> {
  return Result.failure(new ServiceError(message, options));
}

function repositoryError(
  message: string,
  options: ErrorOptions = {},
): Failure<RepositoryError> {
  return Result.failure(
    new RepositoryError(message, {
      ...options,
      retryable: options.retryable ?? isRetryableErrorKind(options.kind),
    }),
  );
}

function infrastructureError(
  message: string,
  options: ErrorOptions = {},
): Failure<InfrastructureError> {
  return Result.failure(
    new InfrastructureError(message, {
      ...options,
      retryable: options.retryable ?? isRetryableErrorKind(options.kind),
    }),
  );
}

function queryError(
  message: string,
  options: ErrorOptions = {},
): Failure<QueryError> {
  return Result.failure(
    new QueryError(message, {
      ...options,
      retryable: options.retryable ?? isRetryableErrorKind(options.kind),
    }),
  );
}

function queryNotFoundError(
  message: string,
  options: ErrorOptions = {},
): Failure<QueryNotFoundError> {
  return Result.failure(new QueryNotFoundError(message, options));
}

export const ErrorFactory = {
  DomainError: domainError,
  UseCaseError: useCaseError,
  ServiceError: serviceError,
  RepositoryError: repositoryError,
  InfrastructureError: infrastructureError,
  QueryError: queryError,
  QueryNotFoundError: queryNotFoundError,
};
