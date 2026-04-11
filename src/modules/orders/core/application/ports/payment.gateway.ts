import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';

export interface RecordCodPaymentInput {
  orderId: number;
  amountCollected: number;
  currency: string;
  notes?: string;
  collectedBy?: string;
}

export interface PaymentRecord {
  id: number | null;
}

export interface CreatePaymentIntentInput {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  customerId: number;
  metadata?: Record<string, any>;
}

export interface PaymentIntentResult {
  paymentId: number;
  clientSecret: string;
}

export interface ProcessRefundInput {
  paymentId: number;
  amount: number;
  reason: string;
}

export abstract class PaymentGateway {
  abstract recordCodPayment(
    input: RecordCodPaymentInput,
  ): Promise<Result<PaymentRecord, InfrastructureError>>;

  abstract createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<Result<PaymentIntentResult, InfrastructureError>>;

  abstract processRefund(
    input: ProcessRefundInput,
  ): Promise<Result<void, InfrastructureError>>;
}
