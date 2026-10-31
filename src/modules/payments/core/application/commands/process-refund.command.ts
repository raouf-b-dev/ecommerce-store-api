import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

/**
 * Refund either an explicit major-unit amount, or the payment's
 * remaining balance. Discriminated so an omitted amount cannot
 * silently mean remaining.
 */
export type ProcessRefundCommand = {
  paymentId: number;
  reason?: string;
  callerContext?: CallerContext | null;
} & ({ amount: number } | { mode: 'remaining' });
