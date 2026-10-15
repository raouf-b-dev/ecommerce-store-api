import { ErrorCode } from './error-code';
import { ErrorFactory } from './error.factory';
import { StatusCode } from './status-code';

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

  it('keeps an Error cause when the second argument is an Error', () => {
    const cause = new Error('db down');
    const result = ErrorFactory.RepositoryError('Failed to save', cause);

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

  it('keeps positional cause and status', () => {
    const cause = new Error('db down');
    const result = ErrorFactory.RepositoryError(
      'Failed to save',
      cause,
      StatusCode.SERVICE_UNAVAILABLE,
    );

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

  it('keeps a positional status when cause is omitted', () => {
    const result = ErrorFactory.RepositoryError(
      'Inventory not found',
      undefined,
      StatusCode.NOT_FOUND,
    );

    expect(result).toMatchObject({
      isFailure: true,
      error: {
        statusCode: StatusCode.NOT_FOUND,
        retryable: false,
        code: ErrorCode.REPOSITORY_ERROR,
      },
    });
  });
});
