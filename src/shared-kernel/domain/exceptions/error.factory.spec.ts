import { DomainError } from './domain.error';
import { ErrorCode } from './error-code';
import { ErrorFactory } from './error.factory';
import { ErrorKind } from './error-kind';
import { QueryError, QueryNotFoundError } from './query.error';
import { RepositoryError } from './repository.error';
import { ServiceError } from './service-error';
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
        kind: ErrorKind.RULE_VIOLATION,
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
        kind: ErrorKind.INVALID,
        retryable: false,
      },
    });
  });

  it('sets kind and retryable from options', () => {
    const missing = ErrorFactory.RepositoryError('Inventory not found', {
      kind: ErrorKind.NOT_FOUND,
    });
    const rejected = ErrorFactory.InfrastructureError('Provider rejected', {
      retryable: false,
    });

    expect(missing).toMatchObject({
      isFailure: true,
      error: {
        kind: ErrorKind.NOT_FOUND,
        retryable: false,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
    expect(rejected).toMatchObject({
      isFailure: true,
      error: {
        kind: ErrorKind.INTERNAL,
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
        kind: ErrorKind.INTERNAL,
        retryable: true,
      },
    });
  });

  it('keeps cause and kind via options', () => {
    const cause = new Error('db down');
    const result = ErrorFactory.RepositoryError('Failed to save', {
      cause,
      kind: ErrorKind.UNAVAILABLE,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        cause,
        kind: ErrorKind.UNAVAILABLE,
        retryable: true,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
  });

  it('derives retryable false from a non-retryable kind in the factory', () => {
    const result = ErrorFactory.RepositoryError('Inventory not found', {
      kind: ErrorKind.NOT_FOUND,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        kind: ErrorKind.NOT_FOUND,
        retryable: false,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
  });

  it('derives retryable true from kind INTERNAL in the factory', () => {
    const result = ErrorFactory.RepositoryError('DB blip', {
      kind: ErrorKind.INTERNAL,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        kind: ErrorKind.INTERNAL,
        retryable: true,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
  });

  it('factory kind CONFLICT yields retryable false; direct new yields true', () => {
    const viaFactory = ErrorFactory.RepositoryError('Conflict', {
      kind: ErrorKind.CONFLICT,
    });
    const viaNew = new RepositoryError('Conflict', {
      kind: ErrorKind.CONFLICT,
    });

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

  it('QueryError defaults to INTERNAL and retryable true', () => {
    const error = new QueryError('query failed');

    expect(error).toMatchObject({
      message: 'query failed',
      kind: ErrorKind.INTERNAL,
      code: ErrorCode.QUERY_ERROR,
      retryable: true,
    });
  });

  it('derives QueryError retryable true from kind INTERNAL in the factory', () => {
    const result = ErrorFactory.QueryError('query blip', {
      kind: ErrorKind.INTERNAL,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        kind: ErrorKind.INTERNAL,
        retryable: true,
        code: ErrorCode.QUERY_ERROR,
      },
    });
  });

  it('derives QueryError retryable true from kind UNAVAILABLE in the factory', () => {
    const result = ErrorFactory.QueryError('store unavailable', {
      kind: ErrorKind.UNAVAILABLE,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        kind: ErrorKind.UNAVAILABLE,
        retryable: true,
        code: ErrorCode.QUERY_ERROR,
      },
    });
  });

  it('derives QueryError retryable false from a non-retryable kind in the factory', () => {
    const result = ErrorFactory.QueryError('row missing', {
      kind: ErrorKind.NOT_FOUND,
    });

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        kind: ErrorKind.NOT_FOUND,
        retryable: false,
        code: ErrorCode.QUERY_ERROR,
      },
    });
  });

  it('QueryNotFoundError defaults to NOT_FOUND, QUERY_ERROR, and retryable false', () => {
    const error = new QueryNotFoundError('row missing');

    expect(error).toMatchObject({
      message: 'row missing',
      kind: ErrorKind.NOT_FOUND,
      code: ErrorCode.QUERY_ERROR,
      retryable: false,
    });
  });
});
