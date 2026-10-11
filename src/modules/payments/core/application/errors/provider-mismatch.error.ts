import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { StatusCode } from '../../../../../shared-kernel/domain/exceptions/status-code';
import { ErrorCode } from '../../../../../shared-kernel/domain/exceptions/error-code';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Failure } from '../../../../../shared-kernel/domain/result';

export function providerMismatchError(
  actualProvider: string,
  expectedProvider: string,
): Failure<UseCaseError> {
  return ErrorFactory.UseCaseError(
    `Payment provider ${actualProvider} does not match active provider ${expectedProvider}`,
    {
      status: StatusCode.CONFLICT,
      code: ErrorCode.PAYMENT_PROVIDER_MISMATCH,
    },
  );
}
