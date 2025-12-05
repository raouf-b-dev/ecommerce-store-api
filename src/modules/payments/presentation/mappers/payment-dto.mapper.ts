import { IPayment } from '../../domain/interfaces/payment.interface';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { PaymentMethod } from '../dto/create-payment.dto';
import { PaymentStatus } from '../dto/list-payments-query.dto';

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
      customerId: payment.customerId || undefined,
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
