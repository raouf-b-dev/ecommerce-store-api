import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { RecordCodPaymentDto } from '../../../../primary-adapters/dto/record-cod-payment.dto';
import { Payment } from '../../../domain/entities/payment';
import { PaymentDtoMapper } from '../../../../primary-adapters/mappers/payment-dto.mapper';
import { PaymentResponseDto } from '../../../../primary-adapters/dto/payment-response.dto';

@Injectable()
export class RecordCodPaymentUseCase extends UseCase<
  RecordCodPaymentDto,
  PaymentResponseDto,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    dto: RecordCodPaymentDto,
  ): Promise<Result<PaymentResponseDto, UseCaseError>> {
    try {
      const payment = Payment.createCOD(
        null,
        dto.orderId,
        dto.amountCollected,
        dto.currency,
      );

      const saveResult = await this.paymentRepository.save(payment);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(
        PaymentDtoMapper.toResponse(saveResult.value.toPrimitives()),
      );
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error recording COD payment',
        error,
      );
    }
  }
}
