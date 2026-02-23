import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { Order } from '../../../domain/entities/order';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';

@Injectable()
export class ProcessOrderUseCase
  implements UseCase<number, IOrder, UseCaseError>
{
  constructor(private orderRepository: OrderRepository) {}
  async execute(id: number): Promise<Result<IOrder, UseCaseError>> {
    try {
      const orderResult = await this.orderRepository.findById(id);
      if (orderResult.isFailure) return orderResult;

      const order: Order = orderResult.value;

      const processResult = order.process();
      if (processResult.isFailure) return processResult;

      const updateResult = await this.orderRepository.updateStatus(
        id,
        order.status,
      );
      if (updateResult.isFailure) return updateResult;

      return Result.success(order.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Usecase Error', error);
    }
  }
}
