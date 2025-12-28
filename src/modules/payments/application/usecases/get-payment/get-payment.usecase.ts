import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class GetPaymentUseCase extends UseCase<number, IPayment, UseCaseError> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(id: number): Promise<Result<IPayment, UseCaseError>> {
    try {
      const result = await this.paymentRepository.findById(id);

      if (isFailure(result)) return result;

      return Result.success(result.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error getting payment',
        error,
      );
    }
  }
}
