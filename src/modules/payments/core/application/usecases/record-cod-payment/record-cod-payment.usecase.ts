import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Payment } from '../../../domain/entities/payment';
import { IPayment } from '../../../domain/interfaces/payment.interface';

export interface RecordCodPaymentCommand {
  orderId: number;
  amountCollected: number;
  currency: string;
  collectedBy?: string;
  notes?: string;
}

@Injectable()
export class RecordCodPaymentUseCase extends UseCase<
  RecordCodPaymentCommand,
  IPayment,
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    dto: RecordCodPaymentCommand,
  ): Promise<Result<IPayment, UseCaseError>> {
    const payment = Payment.createCOD(
      null,
      dto.orderId,
      dto.amountCollected,
      dto.currency,
    );

    const saveResult = await this.paymentRepository.save(payment);

    if (isFailure(saveResult)) return saveResult;

    return Result.success(saveResult.value.toPrimitives());
  }
}
