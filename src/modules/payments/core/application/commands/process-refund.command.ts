import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';

/**
 * Application refund command. Same amount shape as orders RefundAmount:
 * explicit Money, or the payment's remaining balance. Discriminated so
 * an omitted amount cannot silently mean remaining.
 */
export type ProcessRefundCommand = {
  paymentId: number;
  reason?: string;
  callerContext?: CallerContext | null;
} & ({ amount: Money } | { mode: 'remaining' });

/**
 * HTTP edge input: major-unit float from the wire. Currency is not on the
 * refund DTO; ProcessRefundUseCase converts once with the loaded payment's
 * currency. Not a domain Money command - keep it out of ProcessRefundCommand.
 */
export type ProcessRefundHttpCommand = {
  paymentId: number;
  reason?: string;
  callerContext?: CallerContext | null;
  majorUnits: number;
};

/** What ProcessRefundUseCase.execute accepts. */
export type ProcessRefundUseCaseInput =
  ProcessRefundCommand | ProcessRefundHttpCommand;

export function isProcessRefundHttpCommand(
  input: ProcessRefundUseCaseInput,
): input is ProcessRefundHttpCommand {
  return 'majorUnits' in input;
}

export function isRemainingRefund(
  input: ProcessRefundCommand,
): input is Extract<ProcessRefundCommand, { mode: 'remaining' }> {
  return 'mode' in input && input.mode === 'remaining';
}
