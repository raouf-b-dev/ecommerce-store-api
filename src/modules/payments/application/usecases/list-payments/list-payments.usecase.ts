import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { ListPaymentsQueryDto } from '../../../presentation/dto/list-payments-query.dto';

import { IPayment } from '../../../domain/interfaces/payment.interface';

@Injectable()
export class ListPaymentsUseCase extends UseCase<
  ListPaymentsQueryDto,
  IPayment[],
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    dto: ListPaymentsQueryDto,
  ): Promise<Result<IPayment[], UseCaseError>> {
    try {
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
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error listing payments',
        error,
      );
    }
  }
}
