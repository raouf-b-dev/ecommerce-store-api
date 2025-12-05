import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { CreatePaymentDto } from '../../../presentation/dto/create-payment.dto';
import { Payment } from '../../../domain/entities/payment';

import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class CreatePaymentUseCase extends UseCase<
  CreatePaymentDto,
  IPayment,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    dto: CreatePaymentDto,
  ): Promise<Result<IPayment, UseCaseError>> {
    try {
      const payment = Payment.create(
        null,
        dto.orderId,
        dto.amount,
        dto.currency,
        dto.paymentMethod,
        dto.customerId,
        dto.paymentMethodDetails
          ? JSON.stringify(dto.paymentMethodDetails)
          : undefined,
      );

      const saveResult = await this.paymentRepository.save(payment);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(saveResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error creating payment',
        error,
      );
    }
  }
}
