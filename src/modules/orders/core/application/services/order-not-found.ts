import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';

/** Shared not-found UseCaseError for GET and cancel (same body, no existence oracle). */
export function orderNotFoundError(
  orderId: number,
): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError(`Order with id ${orderId} not found`);
}
