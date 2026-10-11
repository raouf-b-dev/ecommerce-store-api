import { providerMismatchError } from './provider-mismatch.error';
import { StatusCode } from '../../../../../shared-kernel/domain/exceptions/status-code';
import { ErrorCode } from '../../../../../shared-kernel/domain/exceptions/error-code';

describe('providerMismatchError', () => {
  it('creates UseCaseError with status 409 and PAYMENT_PROVIDER_MISMATCH code', () => {
    const failure = providerMismatchError('other', 'stripe');
    expect(failure.isFailure).toBe(true);
    expect(failure.error.message).toBe(
      'Payment provider other does not match active provider stripe',
    );
    expect(failure.error.statusCode).toBe(StatusCode.CONFLICT);
    expect(failure.error.code).toBe(ErrorCode.PAYMENT_PROVIDER_MISMATCH);
  });
});
