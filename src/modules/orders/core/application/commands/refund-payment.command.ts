import { RefundAmount } from '../../domain/value-objects/refund-amount';

/**
 * Application command for refunding a checkout payment.
 * Shared by the refund use case, payment gateway port, and queue
 * payload mapper (same role as other commands: not an HTTP DTO).
 */
export type RefundPaymentCommand = {
  paymentId: number;
  reason: string;
} & RefundAmount;
