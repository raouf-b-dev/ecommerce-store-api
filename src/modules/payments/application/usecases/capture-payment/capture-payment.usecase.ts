import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';

import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class CapturePaymentUseCase extends UseCase<
  string,
  IPayment,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(id: string): Promise<Result<IPayment, UseCaseError>> {
    try {
      const paymentResult = await this.paymentRepository.findById(id);
      if (isFailure(paymentResult)) return paymentResult;

      const payment = paymentResult.value;
      payment.capture();

      const saveResult = await this.paymentRepository.update(payment);
      if (isFailure(saveResult)) return saveResult;

      return Result.success(saveResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error capturing payment',
        error,
      );
    }
  }
}
