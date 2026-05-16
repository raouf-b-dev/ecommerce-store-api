import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';

export interface ListPaymentsQuery {
  orderId?: number;
  customerId?: number;
  status?: PaymentStatusType;
  paymentMethod?: PaymentMethodType;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListPaymentsUseCase extends UseCase<
  ListPaymentsQuery,
  IPayment[],
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    dto: ListPaymentsQuery,
  ): Promise<Result<IPayment[], UseCaseError>> {
    if (dto.orderId) {
      const result = await this.paymentRepository.findByOrderId(dto.orderId);
      if (isFailure(result)) return result;
      return Result.success(result.value.map((p) => p.toPrimitives()));
    }

    if (dto.customerId) {
      const result = await this.paymentRepository.findByCustomerId(
        dto.customerId,
        dto.page,
        dto.limit,
      );
      if (isFailure(result)) return result;
      return Result.success(result.value.map((p) => p.toPrimitives()));
    }

    // TODO: Implement general findAll if needed, or return empty array
    return Result.success([]);
  }
}
