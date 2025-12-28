// src/modules/payments/infrastructure/gateways/paypal.gateway.ts
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
export class PayPalGateway implements IPaymentGateway {
  getMethod(): PaymentMethodType {
    return PaymentMethodType.PAYPAL;
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<Result<PaymentIntentResult, InfrastructureError>> {
    // STUB: Simulate PayPal Order creation
    const orderId = `PAYPAL-${uuidv4().substring(0, 17).toUpperCase()}`;
    // PayPal uses approval URL, but we map to clientSecret for consistency
    const clientSecret = `https://sandbox.paypal.com/checkoutnow?token=${orderId}`;

    return Result.success({
      paymentIntentId: orderId,
      clientSecret,
      status: PaymentStatusType.PENDING,
    });
  }

  async authorize(
    amount: number,
    currency: string,
    paymentMethodDetails?: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate PayPal authorization
    return Result.success({
      success: true,
      status: PaymentStatusType.AUTHORIZED,
      transactionId: `paypal_order_${uuidv4()}`,
      metadata: {
        method: 'PayPal',
        amount,
        currency,
        details: paymentMethodDetails,
      },
    });
  }

  async capture(
    transactionId: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    // STUB: Simulate PayPal capture
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
    // STUB: Simulate PayPal refund
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
