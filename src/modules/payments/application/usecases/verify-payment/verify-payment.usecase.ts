import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class VerifyPaymentUseCase extends UseCase<
  number,
  IPayment,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(id: number): Promise<Result<IPayment, UseCaseError>> {
    try {
      const result = await this.paymentRepository.findById(id);

      if (isFailure(result)) return result;

      // Logic to verify payment status with external provider could be added here
      // For now, we just return the payment

      return Result.success(result.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error verifying payment',
        error,
      );
    }
  }
}
