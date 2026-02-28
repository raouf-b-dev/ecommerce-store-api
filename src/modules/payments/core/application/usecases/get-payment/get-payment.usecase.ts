import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentResponseDto } from '../../../../primary-adapters/dto/payment-response.dto';
import { PaymentDtoMapper } from '../../../../primary-adapters/mappers/payment-dto.mapper';

@Injectable()
export class GetPaymentUseCase extends UseCase<
  number,
  PaymentResponseDto,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(id: number): Promise<Result<PaymentResponseDto, UseCaseError>> {
    try {
      const result = await this.paymentRepository.findById(id);

      if (isFailure(result)) return result;

      return Result.success(
        PaymentDtoMapper.toResponse(result.value.toPrimitives()),
      );
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error getting payment',
        error,
      );
    }
  }
}
