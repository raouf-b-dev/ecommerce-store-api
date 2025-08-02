// src/modules/orders/application/usecases/GetOrder/get-order.usecase.ts
import { Injectable } from '@nestjs/common';
import { Order } from '../../../domain/entities/order';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class GetOrderUseCase extends UseCase<number, Order, UseCaseError> {
  constructor(private readonly orderRepository: OrderRepository) {
    super();
  }

  async execute(id: number): Promise<Result<Order, UseCaseError>> {
    try {
      const orderResult = await this.orderRepository.findById(id);

      if (isFailure(orderResult)) {
        return ErrorFactory.UseCaseError(`Order with id ${id} not found`);
      }

      return Result.success(orderResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
