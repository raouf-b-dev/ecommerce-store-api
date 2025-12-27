// src/modules/payments/infrastructure/gateways/stripe.gateway.ts
import { Injectable } from '@nestjs/common';
import { IPaymentGateway } from '../../domain/gateways/payment-gateway.interface';
import { PaymentMethodType } from '../../domain/value-objects/payment-method';
import {
  PaymentResult,
  PaymentIntentResult,
} from '../../domain/gateways/payment-result';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';

@Injectable()
export class StripeGateway implements IPaymentGateway {
  getMethod(): PaymentMethodType {
    return PaymentMethodType.STRIPE;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<Result<PaymentIntentResult, InfrastructureError>> {
    // STUB: Simulate Stripe PaymentIntent creation
    const paymentIntentId = `pi_${uuidv4().replace(/-/g, '')}`;
    const clientSecret = `${paymentIntentId}_secret_${uuidv4().substring(0, 24)}`;

    return Result.success({
      paymentIntentId,
      clientSecret,
      status: PaymentStatusType.PENDING,
    });
  }

  async authorize(
    amount: number,
    currency: string,
    paymentMethodDetails?: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate Stripe authorization
    return Result.success({
      success: true,
      status: PaymentStatusType.AUTHORIZED,
      transactionId: `stripe_pi_${uuidv4()}`,
      metadata: {
        method: 'Stripe',
        amount,
        currency,
        details: paymentMethodDetails,
      },
    });
  }

  async capture(
    transactionId: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate Stripe capture
    return Result.success({
      success: true,
      status: PaymentStatusType.CAPTURED,
      transactionId,
    });
  }

  async refund(
    transactionId: string,
    amount: number,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate Stripe refund
    return Result.success({
      success: true,
      status: PaymentStatusType.REFUNDED,
      transactionId,
      metadata: {
        refundAmount: amount,
      },
    });
  }
}
