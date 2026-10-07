import { IPayment } from '../../core/domain/interfaces/payment.interface';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { ProcessRefundDto } from '../dto/process-refund.dto';
import { ProcessRefundCommand } from '../../core/application/commands/process-refund.command';
import { Result } from '../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from '../../../../shared-kernel/domain/exceptions/error-code';
import {
  decimalFromMinorUnits,
  minorUnitsFromDecimal,
} from '../../../../shared-kernel/domain/value-objects/money-decimal';

export class PaymentDtoMapper {
  static toResponse(payment: IPayment): PaymentResponseDto {
    return {
      id: payment.id!,
      orderId: payment.orderId,
      amount: Number(decimalFromMinorUnits(payment.amount)),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId || undefined,
      gatewayPaymentIntentId: payment.gatewayPaymentIntentId,
      userId: payment.userId || undefined,
      paymentMethodInfo: payment.paymentMethodInfo || undefined,
      refundedAmount: Number(decimalFromMinorUnits(payment.refundedAmount)),
      failureReason: payment.failureReason || undefined,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt || undefined,
      updatedAt: payment.updatedAt,
    };
  }

  static toRefundCommand(
    paymentId: number,
    dto: ProcessRefundDto,
  ): Result<ProcessRefundCommand, UseCaseError> {
    const amount = minorUnitsFromDecimal(dto.amount);
    if (amount === undefined) {
      return ErrorFactory.UseCaseError(
        'Refund amount must be a non-negative scale-2 decimal',
        { code: ErrorCode.REFUND_AMOUNT_INVALID },
      );
    }

    return Result.success({
      paymentId,
      amount,
      reason: dto.reason,
    });
  }

  static toResponseList(payments: IPayment[]): PaymentResponseDto[] {
    return payments.map((payment) => this.toResponse(payment));
  }
}
