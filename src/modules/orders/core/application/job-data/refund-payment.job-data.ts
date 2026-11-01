import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { RefundAmount } from '../../domain/schedulers/order.scheduler';
import { ProcessRefundInput } from '../ports/payment.gateway';

/** BullMQ JSON shape for a refund amount. Money cannot travel on the wire. */
export type RefundPaymentJobAmount =
  { amountMinor: number; currency: string } | { mode: 'remaining' };

export type RefundPaymentJobData = {
  orderId: number;
  paymentId: number;
  reason: string;
  correlationId?: string;
} & RefundPaymentJobAmount;

/**
 * Runtime job data may still be a pre-deploy payload with neither
 * mode nor amountMinor; deserialize fails loudly for those.
 */
export type RefundPaymentJobDataRuntime = {
  orderId: number;
  paymentId: number;
  reason: string;
  correlationId?: string;
  mode?: 'remaining';
  amountMinor?: number;
  currency?: string;
};

/** Serialize domain RefundAmount for the BullMQ payload. */
export function toRefundJobAmount(
  refund: RefundAmount,
): RefundPaymentJobAmount {
  if ('mode' in refund) {
    return { mode: 'remaining' };
  }
  return {
    amountMinor: refund.amount.value,
    currency: refund.amount.currency,
  };
}

/** Rebuild ProcessRefundInput from job data. Legacy payloads fail loudly. */
export function toProcessRefundInput(
  data: RefundPaymentJobDataRuntime,
): Result<ProcessRefundInput, UseCaseError> {
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
