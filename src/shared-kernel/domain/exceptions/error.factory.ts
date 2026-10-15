import { DomainError } from './domain.error';
import { UseCaseError } from './usecase.error';
import { RepositoryError } from './repository.error';
import { Failure, Result } from '../result';
import { ServiceError } from './service-error';
import { InfrastructureError } from './infrastructure-error';
import { QueryError, QueryNotFoundError } from './query.error';
import { ErrorCode } from './error-code';
import {
  ErrorOptions,
  isRetryableHttpStatus,
  resolveErrorArgs,
} from './error-options';
import { toOptionalError } from '../../infra/lang/error.utils';

function domainError(
  message: string,
  options: ErrorOptions,
): Failure<DomainError>;
function domainError(
  message: string,
  cause?: unknown,
  status?: number,
  code?: ErrorCode,
): Failure<DomainError>;
function domainError(
  message: string,
  causeOrOptions?: unknown,
  status?: number,
  code?: ErrorCode,
): Failure<DomainError> {
  return Result.failure(new DomainError(message, causeOrOptions, status, code));
}

function useCaseError(
  message: string,
  options: ErrorOptions,
): Failure<UseCaseError>;
function useCaseError(
  message: string,
  cause?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<UseCaseError>;
function useCaseError(
  message: string,
  causeOrOptions?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<UseCaseError> {
  return Result.failure(
    new UseCaseError(message, causeOrOptions, status, retryable, code),
  );
}

function serviceError(
  message: string,
  options: ErrorOptions,
): Failure<ServiceError>;
function serviceError(
  message: string,
  cause?: unknown,
  status?: number,
  code?: ErrorCode,
): Failure<ServiceError>;
function serviceError(
  message: string,
  causeOrOptions?: unknown,
  status?: number,
  code?: ErrorCode,
): Failure<ServiceError> {
  return Result.failure(
    new ServiceError(message, causeOrOptions, status, code),
  );
}

function repositoryError(
  message: string,
  options: ErrorOptions,
): Failure<RepositoryError>;
function repositoryError(
  message: string,
  cause?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<RepositoryError>;
function repositoryError(
  message: string,
  causeOrOptions?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<RepositoryError> {
  const resolved = resolveErrorArgs(causeOrOptions, status, retryable, code);
  return Result.failure(
    new RepositoryError(
      message,
      resolved.cause,
      resolved.status,
      resolved.retryable ?? isRetryableHttpStatus(resolved.status),
      resolved.code,
    ),
  );
}

function infrastructureError(
  message: string,
  options: ErrorOptions,
): Failure<InfrastructureError>;
function infrastructureError(
  message: string,
  cause?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<InfrastructureError>;
function infrastructureError(
  message: string,
  causeOrOptions?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<InfrastructureError> {
  const resolved = resolveErrorArgs(causeOrOptions, status, retryable, code);
  return Result.failure(
    new InfrastructureError(
      message,
      resolved.cause,
      resolved.status,
      resolved.retryable ?? isRetryableHttpStatus(resolved.status),
      resolved.code,
    ),
  );
}

function queryError(
  message: string,
  options: ErrorOptions,
): Failure<QueryError>;
function queryError(
  message: string,
  cause?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<QueryError>;
function queryError(
  message: string,
  causeOrOptions?: unknown,
  status?: number,
  retryable?: boolean,
  code?: ErrorCode,
): Failure<QueryError> {
  const resolved = resolveErrorArgs(causeOrOptions, status, retryable, code);
  return Result.failure(
    new QueryError(
      message,
      resolved.cause,
      resolved.status,
      resolved.retryable ?? isRetryableHttpStatus(resolved.status),
      resolved.code,
    ),
  );
}

export const ErrorFactory = {
  DomainError: domainError,
  UseCaseError: useCaseError,
  ServiceError: serviceError,
  RepositoryError: repositoryError,
  InfrastructureError: infrastructureError,
  QueryError: queryError,
  QueryNotFoundError: (message: string, cause?: unknown) =>
    Result.failure(new QueryNotFoundError(message, toOptionalError(cause))),
};
