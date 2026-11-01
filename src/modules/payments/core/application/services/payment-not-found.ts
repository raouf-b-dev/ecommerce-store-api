import { ErrorCode } from '../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';

export function paymentNotFoundError(
  paymentId: number,
): Result<never, UseCaseError> {
  return ErrorFactory.UseCaseError(`Payment with id ${paymentId} not found`, {
    kind: ErrorKind.NOT_FOUND,
    code: ErrorCode.PAYMENT_NOT_FOUND,
  });
}
