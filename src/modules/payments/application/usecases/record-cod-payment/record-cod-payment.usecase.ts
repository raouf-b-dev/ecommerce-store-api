import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { RecordCodPaymentDto } from '../../../presentation/dto/record-cod-payment.dto';
import { Payment } from '../../../domain/entities/payment';
import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class RecordCodPaymentUseCase extends UseCase<
  RecordCodPaymentDto,
  IPayment,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    dto: RecordCodPaymentDto,
  ): Promise<Result<IPayment, UseCaseError>> {
    try {
      const payment = Payment.createCOD(
        null,
        dto.orderId,
        dto.amountCollected,
        dto.currency,
      );

      const saveResult = await this.paymentRepository.save(payment);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(saveResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error recording COD payment',
        error,
      );
    }
  }
}
