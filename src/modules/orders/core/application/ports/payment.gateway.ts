import { Result } from '../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../shared-kernel/domain/exceptions/app.error';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { RefundAmount } from '../../domain/schedulers/order.scheduler';

export interface CreatePaymentInput {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  paymentMethodDetails?: {
    token?: string;
    cardLast4?: string;
    cardBrand?: string;
    walletId?: string;
  };
  userId: number;
}

export interface CreatedPayment {
  id: number;
  orderId: number;
  userId: number | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  status: string;
  transactionId: string | null;
  gatewayPaymentIntentId: string | null;
  paymentMethodInfo: string | null;
  refundedAmount: number;
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface CreatePaymentIntentInput {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  userId: number;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  paymentId: number;
  clientSecret: string;
}

export type ProcessRefundInput = {
  paymentId: number;
  reason: string;
} & RefundAmount;

export abstract class PaymentGateway {
  abstract createPayment(
    input: CreatePaymentInput,
  ): Promise<Result<CreatedPayment, AppError>>;

  abstract createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<Result<PaymentIntentResult, AppError>>;

  abstract processRefund(
    input: ProcessRefundInput,
  ): Promise<Result<void, InfrastructureError>>;
}
