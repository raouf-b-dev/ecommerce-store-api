import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Result } from '../../../../../shared-kernel/domain/result';

/** Shared 409 when an order cannot be cancelled in its current state. */
export function orderCannotBeCancelledError(): Result<never, DomainError> {
  return ErrorFactory.DomainError(
    'Order cannot be cancelled in current state',
    { status: 409 },
  );
}
