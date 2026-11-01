import { ErrorCode } from '../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';

export const CART_NOT_FOUND_OPTIONS = {
  kind: ErrorKind.NOT_FOUND,
  code: ErrorCode.CART_NOT_FOUND,
} as const;

export function cartNotFoundError(
  cartId: number | null,
): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError(
    `Cart with id ${cartId} not found`,
    CART_NOT_FOUND_OPTIONS,
  );
}
