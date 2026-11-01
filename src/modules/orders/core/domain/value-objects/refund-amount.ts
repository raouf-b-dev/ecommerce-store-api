import { Money } from '../../../../../shared-kernel/domain/value-objects/money';

/**
 * Explicit Money (cancel path) or the payment's remaining balance
 * (surplus path). Discriminated so an omitted amount cannot silently
 * mean remaining.
 */
export type RefundAmount = { amount: Money } | { mode: 'remaining' };
