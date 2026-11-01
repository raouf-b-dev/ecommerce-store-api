import {
  toRefundPayloadAmount,
  toRefundPaymentCommand,
} from './refund-payment.payload';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('refund payment payload', () => {
  it('round-trips an explicit Money amount to RefundPaymentCommand', () => {
    const moneyResult = Money.create(4999, 'USD');
    ResultAssertionHelper.assertResultSuccess(moneyResult);
    const serialized = toRefundPayloadAmount({ amount: moneyResult.value });
    const commandResult = toRefundPaymentCommand({
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      ...serialized,
    });

    ResultAssertionHelper.assertResultSuccess(commandResult);
    expect(commandResult.value).toEqual({
      paymentId: 10,
      reason: 'Order cancelled',
      amount: moneyResult.value,
    });
  });

  it('round-trips remaining mode to RefundPaymentCommand', () => {
    const serialized = toRefundPayloadAmount({ mode: 'remaining' });
    const commandResult = toRefundPaymentCommand({
      orderId: 1,
      paymentId: 10,
      reason: 'Surplus payment refund',
      ...serialized,
    });

    ResultAssertionHelper.assertResultSuccess(commandResult);
    expect(commandResult.value).toEqual({
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
    const commandResult = toRefundPaymentCommand(legacyData);

    ResultAssertionHelper.assertResultFailure(
      commandResult,
      'legacy refund job payload: let the refund-payment queue finish before deploying',
      UseCaseError,
    );
    expect(commandResult).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
  });

  it('returns a non-retryable failure when amountMinor is not a valid Money', () => {
    const commandResult = toRefundPaymentCommand({
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      amountMinor: -1,
      currency: 'USD',
    });

    ResultAssertionHelper.assertResultFailure(
      commandResult,
      'Amount must be a non-negative integer in minor units',
      UseCaseError,
    );
    expect(commandResult).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
  });

  it('returns a non-retryable failure when amountMinor is not an integer', () => {
    const commandResult = toRefundPaymentCommand({
      orderId: 1,
      paymentId: 10,
      reason: 'Order cancelled',
      amountMinor: 12.5,
      currency: 'USD',
    });

    ResultAssertionHelper.assertResultFailure(
      commandResult,
      'Amount must be a non-negative integer in minor units',
      UseCaseError,
    );
    expect(commandResult).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
  });
});
