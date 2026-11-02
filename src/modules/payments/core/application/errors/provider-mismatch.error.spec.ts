import { providerMismatchError } from './provider-mismatch.error';
import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';
import { ErrorCode } from '../../../../../shared-kernel/domain/exceptions/error-code';

describe('providerMismatchError', () => {
  it('creates UseCaseError with status 409 and PAYMENT_PROVIDER_MISMATCH code', () => {
    const failure = providerMismatchError('other', 'stripe');
    expect(failure.isFailure).toBe(true);
    expect(failure.error.message).toBe(
      'Payment provider other does not match active provider stripe',
    );
    expect(failure.error.kind).toBe(ErrorKind.CONFLICT);
    expect(failure.error.code).toBe(ErrorCode.PAYMENT_PROVIDER_MISMATCH);
  });
});
