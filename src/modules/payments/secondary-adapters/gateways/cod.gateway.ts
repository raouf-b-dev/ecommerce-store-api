// src/modules/payments/infrastructure/gateways/cod.gateway.ts
import { Injectable } from '@nestjs/common';
import { IPaymentGateway } from '../../core/domain/gateways/payment-gateway.interface';
import { PaymentMethodType } from '../../core/domain/value-objects/payment-method';
import {
  PaymentResult,
  PaymentIntentResult,
} from '../../core/domain/gateways/payment-result';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/errors/error.factory';
import { InfrastructureError } from '../../../../shared-kernel/errors/infrastructure-error';

@Injectable()
export class CodGateway implements IPaymentGateway {
  getMethod(): PaymentMethodType {
    return PaymentMethodType.CASH_ON_DELIVERY;
  }

  async createPaymentIntent(
    _amount: number,
    _currency: string,
    _metadata?: Record<string, string>,
  ): Promise<Result<PaymentIntentResult, InfrastructureError>> {
    return ErrorFactory.ServiceError(
      'Cash on Delivery does not support payment intents',
    );
  }

  async authorize(
    amount: number,
    currency: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    return Result.success({
      success: true,
      status: PaymentStatusType.AUTHORIZED,
      transactionId: `cod_${uuidv4()}`,
      metadata: {
        method: 'COD',
        amount,
        currency,
      },
    });
  }

  async capture(
    transactionId: string,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    return Result.success({
      success: true,
      status: PaymentStatusType.COMPLETED,
      transactionId,
    });
  }

  async refund(
    transactionId: string,
    amount: number,
  ): Promise<Result<PaymentResult, InfrastructureError>> {
    return Result.success({
      success: true,
      status: PaymentStatusType.REFUNDED,
      transactionId,
      metadata: {
        refundAmount: amount,
        note: 'Manual COD refund required',
      },
    });
  }
}
