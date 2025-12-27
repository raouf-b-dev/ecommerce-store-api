// src/modules/payments/domain/gateways/payment-gateway.interface.ts
import { PaymentResult, PaymentIntentResult } from './payment-result';
import { PaymentMethodType } from '../value-objects/payment-method';
import { Result } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';

export interface IPaymentGateway {
  getMethod(): PaymentMethodType;

  /**
   * Create a payment intent for client-side confirmation (Stripe/PayPal flow).
   * Returns paymentIntentId and clientSecret for frontend.
   */
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<Result<PaymentIntentResult, InfrastructureError>>;

  /**
   * Authorize a payment (legacy flow or after intent confirmation).
   */
  authorize(
    amount: number,
    currency: string,
    paymentMethodDetails?: string,
  ): Promise<Result<PaymentResult, InfrastructureError>>;

  capture(
    transactionId: string,
  ): Promise<Result<PaymentResult, InfrastructureError>>;

  refund(
    transactionId: string,
    amount: number,
  ): Promise<Result<PaymentResult, InfrastructureError>>;
}
