import { CreatedPayment } from '../../core/application/ports/payment.gateway';
import { decimalFromMinorUnits } from '../../../../shared-kernel/domain/value-objects/money-decimal';
import { OrderPaymentResponseDto } from '../dto/order-payment-response.dto';

export class OrderPaymentDtoMapper {
  static toResponse(payment: CreatedPayment): OrderPaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: Number(decimalFromMinorUnits(payment.amount)),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId,
      gatewayPaymentIntentId: payment.gatewayPaymentIntentId,
      userId: payment.userId,
      paymentMethodInfo: payment.paymentMethodInfo,
      refundedAmount: Number(decimalFromMinorUnits(payment.refundedAmount)),
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      updatedAt: payment.updatedAt,
    };
  }
}
