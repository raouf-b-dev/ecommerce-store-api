// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { IPayment } from '../../core/domain/interfaces/payment.interface';
import { PaymentResponseDto } from '../dto/payment-response.dto';

export class PaymentDtoMapper {
  static toResponse(payment: IPayment): PaymentResponseDto {
    return {
      id: payment.id!,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId || undefined,
      gatewayPaymentIntentId: payment.gatewayPaymentIntentId,
      userId: payment.userId || undefined,
      paymentMethodInfo: payment.paymentMethodInfo || undefined,
      refundedAmount: payment.refundedAmount,
      failureReason: payment.failureReason || undefined,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt || undefined,
      updatedAt: payment.updatedAt,
    };
  }

  static toResponseList(payments: IPayment[]): PaymentResponseDto[] {
    return payments.map((payment) => this.toResponse(payment));
  }
}
