import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';
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
      kind: ErrorKind.CONFLICT,
      code: ErrorCode.PAYMENT_PROVIDER_MISMATCH,
    },
  );
}
