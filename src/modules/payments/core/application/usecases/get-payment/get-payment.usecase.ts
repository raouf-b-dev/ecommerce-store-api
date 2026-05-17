import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class GetPaymentUseCase extends UseCase<number, IPayment, UseCaseError> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(id: number): Promise<Result<IPayment, UseCaseError>> {
    const result = await this.paymentRepository.findById(id);

    if (isFailure(result)) return result;

    return Result.success(result.value.toPrimitives());
  }
}
