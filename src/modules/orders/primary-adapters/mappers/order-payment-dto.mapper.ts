import { CreatedPayment } from '../../core/application/ports/payment.gateway';
import { requireMajorUnitsFromMinor } from '../../../../infrastructure/mappers/utils/decimal-money.util';
import { OrderPaymentResponseDto } from '../dto/order-payment-response.dto';

export class OrderPaymentDtoMapper {
  static toResponse(payment: CreatedPayment): OrderPaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: requireMajorUnitsFromMinor(payment.amount, payment.currency),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId,
      gatewayPaymentIntentId: payment.gatewayPaymentIntentId,
      userId: payment.userId,
      paymentMethodInfo: payment.paymentMethodInfo,
      refundedAmount: requireMajorUnitsFromMinor(
        payment.refundedAmount,
        payment.currency,
      ),
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      updatedAt: payment.updatedAt,
    };
  }
}
