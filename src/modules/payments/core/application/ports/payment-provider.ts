import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';

export type PaymentNextAction = {
  type: 'confirm_on_client';
  clientSecret: string;
};

export interface InitiatePaymentParams {
  amount: Money;
  metadata?: Record<string, string>;
  idempotencyKey: string;
}

export interface InitiatePaymentResult {
  providerReference: string;
  status: PaymentStatusType;
  nextAction: PaymentNextAction;
}

export interface ProviderOperationResult {
  providerReference: string;
  status: PaymentStatusType;
}

export interface RefundParams {
  providerReference: string;
  amount: Money;
  idempotencyKey: string;
}

export abstract class PaymentProvider {
  abstract initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<Result<InitiatePaymentResult, InfrastructureError>>;

  abstract authorize(
    amount: Money,
    paymentMethodDetails?: string,
  ): Promise<Result<ProviderOperationResult, InfrastructureError>>;

  abstract capture(
    providerReference: string,
    amount: Money,
  ): Promise<Result<ProviderOperationResult, InfrastructureError>>;

  abstract refund(
    params: RefundParams,
  ): Promise<Result<ProviderOperationResult, InfrastructureError>>;
}
