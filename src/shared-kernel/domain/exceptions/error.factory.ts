// core/errors/error.factory.ts
import { DomainError } from './domain.error';
import { UseCaseError } from './usecase.error';
import { RepositoryError } from './repository.error';
import { Result } from '../result';
import { HttpStatus } from '@nestjs/common';
import { ServiceError } from './service-error';
import { InfrastructureError } from './infrastructure-error';
import { QueryError, QueryNotFoundError } from './query.error';
import { toOptionalError } from '../../infra/lang/error.utils';

function isRetryableHttpStatus(status?: number): boolean {
  if (!status) return true;
  return status >= 500;
}

export const ErrorFactory = {
  DomainError: (message: string, cause?: unknown, status?: HttpStatus) =>
    Result.failure(new DomainError(message, toOptionalError(cause), status)),
  UseCaseError: (message: string, cause?: unknown, status?: HttpStatus) =>
    Result.failure(new UseCaseError(message, toOptionalError(cause), status)),
  ServiceError: (message: string, cause?: unknown, status?: HttpStatus) =>
    Result.failure(new ServiceError(message, toOptionalError(cause), status)),
  RepositoryError: (
    message: string,
    cause?: unknown,
    status?: HttpStatus,
    retryable?: boolean,
  ) =>
    Result.failure(
      new RepositoryError(
        message,
        toOptionalError(cause),
        status,
        retryable ?? isRetryableHttpStatus(status),
      ),
    ),
  InfrastructureError: (
    message: string,
    cause?: unknown,
    status?: HttpStatus,
    retryable?: boolean,
  ) =>
    Result.failure(
      new InfrastructureError(
        message,
        toOptionalError(cause),
        status,
        retryable ?? isRetryableHttpStatus(status),
      ),
    ),
  QueryError: (
    message: string,
    cause?: unknown,
    status?: HttpStatus,
    retryable?: boolean,
  ) =>
    Result.failure(
      new QueryError(
        message,
        toOptionalError(cause),
        status,
        retryable ?? isRetryableHttpStatus(status),
      ),
    ),
  QueryNotFoundError: (message: string, cause?: unknown) =>
    Result.failure(new QueryNotFoundError(message, toOptionalError(cause))),
};
