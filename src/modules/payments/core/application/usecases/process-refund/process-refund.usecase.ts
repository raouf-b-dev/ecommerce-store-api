import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { ProcessRefundDto } from '../../../../primary-adapters/dto/process-refund.dto';
import { Refund } from '../../../domain/entities/refund';
import { PaymentGatewayFactory } from '../../../../secondary-adapters/gateways/payment-gateway.factory';
import { PaymentDtoMapper } from '../../../../primary-adapters/mappers/payment-dto.mapper';
import { PaymentResponseDto } from '../../../../primary-adapters/dto/payment-response.dto';

@Injectable()
export class ProcessRefundUseCase extends UseCase<
  { id: number; dto: ProcessRefundDto },
  PaymentResponseDto,
  UseCaseError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
  ) {
    super();
  }

  async execute(input: {
    id: number;
    dto: ProcessRefundDto;
  }): Promise<Result<PaymentResponseDto, UseCaseError>> {
    try {
      const paymentResult = await this.paymentRepository.findById(input.id);
      if (isFailure(paymentResult)) return paymentResult;

      const payment = paymentResult.value;

      // 1. Get Gateway
      const gateway = this.paymentGatewayFactory.getGateway(
        payment.paymentMethod,
      );

      // 2. Refund via Gateway
      // We need transaction ID to refund.
      if (!payment.transactionId) {
        return ErrorFactory.UseCaseError(
          'Cannot refund payment without transaction ID',
        );
      }

      const gatewayResult = await gateway.refund(
        payment.transactionId,
        input.dto.amount,
      );
      if (isFailure(gatewayResult)) {
        return ErrorFactory.UseCaseError(
          `Gateway refund failed: ${gatewayResult.error.message}`,
          gatewayResult.error,
        );
      }

      const refundResult = gatewayResult.value;
      if (!refundResult.success) {
        return ErrorFactory.UseCaseError(
          `Gateway refund failed: ${refundResult.errorMessage || 'Unknown error'}`,
        );
      }

      const refund = Refund.create(
        null,
        payment.id!,
        input.dto.amount,
        payment.currency,
        input.dto.reason || 'Refund request',
      );

      // We might need to set status to COMPLETED if that was the logic before
      // The create method sets it to PENDING.
      // Previous logic: status: 'COMPLETED'
      refund.markAsCompleted();

      const addRefundResult = payment.addRefund(refund);
      if (isFailure(addRefundResult)) return addRefundResult;

      const saveResult = await this.paymentRepository.update(payment);
      if (isFailure(saveResult)) return saveResult;

      return Result.success(
        PaymentDtoMapper.toResponse(saveResult.value.toPrimitives()),
      );
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error processing refund',
        error,
      );
    }
  }
}
