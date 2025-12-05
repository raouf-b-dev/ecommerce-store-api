import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { ProcessRefundDto } from '../../../presentation/dto/process-refund.dto';
import { Refund } from '../../../domain/entities/refund';
import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class ProcessRefundUseCase extends UseCase<
  { id: string; dto: ProcessRefundDto },
  IPayment,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(input: {
    id: string;
    dto: ProcessRefundDto;
  }): Promise<Result<IPayment, UseCaseError>> {
    try {
      const paymentResult = await this.paymentRepository.findById(input.id);
      if (isFailure(paymentResult)) return paymentResult;

      const payment = paymentResult.value;

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

      return Result.success(saveResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error processing refund',
        error,
      );
    }
  }
}
