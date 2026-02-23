// core/errors/error.factory.ts
import { DomainError } from './domain.error';
import { UseCaseError } from './usecase.error';
import { RepositoryError } from './repository.error';
import { ControllerError } from './controller.error';
import { Result } from '../domain/result';
import { HttpStatus } from '@nestjs/common';
import { ServiceError } from './service-error';
import { InfrastructureError } from './infrastructure-error';

function isRetryableHttpStatus(status?: number): boolean {
  if (!status) return true;
  return status >= 500;
}

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
  DomainError: (message: string, cause?: unknown, status?: HttpStatus) =>
    Result.failure(new DomainError(message, toError(cause), status)),
  UseCaseError: (message: string, cause?: unknown, status?: HttpStatus) =>
    Result.failure(new UseCaseError(message, toError(cause), status)),
  ServiceError: (message: string, cause?: unknown, status?: HttpStatus) =>
    Result.failure(new ServiceError(message, toError(cause), status)),
  ControllerError: (message: string, cause?: unknown, status?: HttpStatus) =>
    Result.failure(new ControllerError(message, toError(cause), status)),
  RepositoryError: (
    message: string,
    cause?: unknown,
    status?: HttpStatus,
    retryable?: boolean,
  ) =>
    Result.failure(
      new RepositoryError(
        message,
        toError(cause),
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
        toError(cause),
        status,
        retryable ?? isRetryableHttpStatus(status),
      ),
    ),
};
