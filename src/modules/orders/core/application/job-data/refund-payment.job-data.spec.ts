import {
  toRefundJobAmount,
  toProcessRefundInput,
} from './refund-payment.job-data';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('refund payment job data', () => {
  it('round-trips an explicit Money amount to ProcessRefundInput', () => {
    const moneyResult = Money.create(4999, 'USD');
    ResultAssertionHelper.assertResultSuccess(moneyResult);
    const serialized = toRefundJobAmount({ amount: moneyResult.value });
    const inputResult = toProcessRefundInput({
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      ...serialized,
    });

    ResultAssertionHelper.assertResultSuccess(inputResult);
    expect(inputResult.value).toEqual({
      paymentId: 10,
      reason: 'Order cancelled',
      amount: moneyResult.value,
    });
  });

  it('round-trips remaining mode to ProcessRefundInput', () => {
    const serialized = toRefundJobAmount({ mode: 'remaining' });
    const inputResult = toProcessRefundInput({
      orderId: 1,
      paymentId: 10,
      reason: 'Surplus payment refund',
      ...serialized,
    });

    ResultAssertionHelper.assertResultSuccess(inputResult);
    expect(inputResult.value).toEqual({
      paymentId: 10,
      reason: 'Surplus payment refund',
      mode: 'remaining',
    });
  });

  it('returns a non-retryable failure for a legacy major-unit payload', () => {
    const legacyData = {
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      amount: 49.99,
    };
    const inputResult = toProcessRefundInput(legacyData);

    ResultAssertionHelper.assertResultFailure(
      inputResult,
      'legacy refund job payload: let the refund-payment queue finish before deploying',
      UseCaseError,
    );
    expect(inputResult).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
  });

  it('returns a non-retryable failure when amountMinor is not a valid Money', () => {
    const inputResult = toProcessRefundInput({
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      amountMinor: -1,
      currency: 'USD',
    });

    ResultAssertionHelper.assertResultFailure(
      inputResult,
      'Amount must be a non-negative integer in minor units',
      UseCaseError,
    );
    expect(inputResult).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
  });

  it('returns a non-retryable failure when amountMinor is not an integer', () => {
    const inputResult = toProcessRefundInput({
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      amountMinor: 12.5,
      currency: 'USD',
    });

    ResultAssertionHelper.assertResultFailure(
      inputResult,
      'Amount must be a non-negative integer in minor units',
      UseCaseError,
    );
    expect(inputResult).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
  });
});
