import { DomainError } from './domain.error';
import { ErrorCode } from './error-code';
import { ErrorFactory } from './error.factory';
import { RepositoryError } from './repository.error';
import { ServiceError } from './service-error';
import { StatusCode } from './status-code';
import { UseCaseError } from './usecase.error';

describe('ErrorFactory', () => {
  it('sets the code from options and keeps the use case defaults', () => {
    const result = ErrorFactory.UseCaseError('Cart is empty', {
      code: ErrorCode.CART_EMPTY,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        message: 'Cart is empty',
        code: ErrorCode.CART_EMPTY,
        statusCode: StatusCode.UNPROCESSABLE_ENTITY,
        retryable: false,
        cause: undefined,
      },
    });
  });

  it('sets the code from options and keeps the domain defaults', () => {
    const result = ErrorFactory.DomainError('Amount is invalid', {
      code: ErrorCode.AMOUNT_INVALID,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        message: 'Amount is invalid',
        code: ErrorCode.AMOUNT_INVALID,
        statusCode: StatusCode.BAD_REQUEST,
        retryable: false,
      },
    });
  });

  it('sets status and retryable from options', () => {
    const missing = ErrorFactory.RepositoryError('Inventory not found', {
      status: StatusCode.NOT_FOUND,
    });
    const rejected = ErrorFactory.InfrastructureError('Provider rejected', {
      retryable: false,
    });

    expect(missing).toMatchObject({
      isFailure: true,
      error: {
        statusCode: StatusCode.NOT_FOUND,
        retryable: false,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
    expect(rejected).toMatchObject({
      isFailure: true,
      error: {
        statusCode: StatusCode.INTERNAL_SERVER_ERROR,
        retryable: false,
        code: ErrorCode.INFRASTRUCTURE_ERROR,
      },
    });
  });

  it('keeps an Error cause when passed via options', () => {
    const cause = new Error('db down');
    const result = ErrorFactory.RepositoryError('Failed to save', { cause });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        message: 'Failed to save',
        code: ErrorCode.REPOSITORY_ERROR,
        cause,
        statusCode: StatusCode.INTERNAL_SERVER_ERROR,
        retryable: true,
      },
    });
  });

  it('keeps cause and status via options', () => {
    const cause = new Error('db down');
    const result = ErrorFactory.RepositoryError('Failed to save', {
      cause,
      status: StatusCode.SERVICE_UNAVAILABLE,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        cause,
        statusCode: StatusCode.SERVICE_UNAVAILABLE,
        retryable: true,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
  });

  it('derives retryable false from a non-5xx status in the factory', () => {
    const result = ErrorFactory.RepositoryError('Inventory not found', {
      status: StatusCode.NOT_FOUND,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        statusCode: StatusCode.NOT_FOUND,
        retryable: false,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
  });

  it('factory status 409 yields retryable false; direct new yields true', () => {
    const viaFactory = ErrorFactory.RepositoryError('Conflict', {
      status: 409,
    });
    const viaNew = new RepositoryError('Conflict', { status: 409 });

    expect(viaFactory.error.retryable).toBe(false);
    expect(viaNew.retryable).toBe(true);
  });

  it('DomainError ignores retryable: true', () => {
    const error = new DomainError('bad', { retryable: true });
    expect(error.retryable).toBe(false);
  });

  it('ServiceError ignores retryable: true', () => {
    const error = new ServiceError('bad', { retryable: true });
    expect(error.retryable).toBe(false);
  });

  it('UseCaseError honours retryable: true', () => {
    const error = new UseCaseError('retry me', { retryable: true });
    expect(error.retryable).toBe(true);
  });

  it('converts a non-Error cause via toOptionalError', () => {
    const result = ErrorFactory.UseCaseError('wrapped', {
      cause: 'plain string',
    });

    expect(result.error.cause).toBeInstanceOf(Error);
    expect(result.error.cause?.message).toBe('plain string');
  });
});
