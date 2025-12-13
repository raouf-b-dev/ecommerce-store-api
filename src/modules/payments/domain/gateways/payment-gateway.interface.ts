// src/modules/payments/domain/gateways/payment-gateway.interface.ts
import { PaymentResult } from './payment-result';
import { PaymentMethodType } from '../value-objects/payment-method';
import { Result } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';

export interface IPaymentGateway {
  getMethod(): PaymentMethodType;

  authorize(
    amount: number,
    currency: string,
    paymentMethodDetails?: string,
  ): Promise<Result<PaymentResult, AppError>>;

  capture(transactionId: string): Promise<Result<PaymentResult, AppError>>;

  refund(
    transactionId: string,
    amount: number,
  ): Promise<Result<PaymentResult, AppError>>;
}
