import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentDtoMapper } from '../../../presentation/mappers/payment-dto.mapper';
import { PaymentResponseDto } from '../../../presentation/dto/payment-response.dto';

@Injectable()
export class VerifyPaymentUseCase extends UseCase<
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

      // Logic to verify payment status with external provider could be added here
      // For now, we just return the payment

      return Result.success(
        PaymentDtoMapper.toResponse(result.value.toPrimitives()),
      );
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error verifying payment',
        error,
      );
    }
  }
}
