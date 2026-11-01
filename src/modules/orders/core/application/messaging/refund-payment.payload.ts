import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { RefundAmount } from '../../domain/value-objects/refund-amount';
import { RefundPaymentCommand } from '../commands/refund-payment.command';

/**
 * Queue payload for a refund amount. Money cannot travel as JSON, so
 * producer and consumer share this contract (same idea as query results:
 * application-owned shape used by both adapter sides).
 */
export type RefundPaymentPayloadAmount =
  { amountMinor: number; currency: string } | { mode: 'remaining' };

export type RefundPaymentPayload = {
  orderId: number;
  paymentId: number;
  reason: string;
  correlationId?: string;
} & RefundPaymentPayloadAmount;

/**
 * Runtime payload may still be a pre-deploy shape with neither
 * mode nor amountMinor; deserialize fails loudly for those.
 */
export type RefundPaymentPayloadRuntime = {
  orderId: number;
  paymentId: number;
  reason: string;
  correlationId?: string;
  mode?: 'remaining';
  amountMinor?: number;
  currency?: string;
};

/** Serialize domain RefundAmount for the queue payload. */
export function toRefundPayloadAmount(
  refund: RefundAmount,
): RefundPaymentPayloadAmount {
  if ('mode' in refund) {
    return { mode: 'remaining' };
  }
  return {
    amountMinor: refund.amount.value,
    currency: refund.amount.currency,
  };
}

/** Rebuild RefundPaymentCommand from queue payload. Legacy shapes fail loudly. */
export function toRefundPaymentCommand(
  data: RefundPaymentPayloadRuntime,
): Result<RefundPaymentCommand, UseCaseError> {
  if (data.mode === 'remaining') {
    return Result.success({
      paymentId: data.paymentId,
      reason: data.reason,
      mode: 'remaining',
    });
  }

  if (
    typeof data.amountMinor === 'number' &&
    typeof data.currency === 'string'
  ) {
    const moneyResult = Money.create(data.amountMinor, data.currency);
    if (moneyResult.isFailure) {
      return ErrorFactory.UseCaseError(moneyResult.error.message, {
        cause: moneyResult.error,
      });
    }
    return Result.success({
      paymentId: data.paymentId,
      reason: data.reason,
      amount: moneyResult.value,
    });
  }

  return ErrorFactory.UseCaseError(
    'legacy refund job payload: let the refund-payment queue finish before deploying',
  );
}
