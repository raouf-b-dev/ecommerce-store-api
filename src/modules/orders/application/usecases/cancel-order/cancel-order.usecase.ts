import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Order } from '../../../domain/entities/order';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';

@Injectable()
export class CancelOrderUseCase
  implements UseCase<number, IOrder, UseCaseError>
{
  constructor(
    private orderRepository: OrderRepository,
    private readonly orderScheduler: OrderScheduler,
  ) {}

  async execute(id: number): Promise<Result<IOrder, UseCaseError>> {
    try {
      const requestedOrder = await this.orderRepository.findById(id);
      if (requestedOrder.isFailure) return requestedOrder;

      const order: Order = requestedOrder.value;

      const cancelResult = order.cancel();
      if (cancelResult.isFailure) return cancelResult;

      const updateResult = await this.orderRepository.cancelOrder(order);
      if (updateResult.isFailure) return updateResult;

      const scheduleResult =
        await this.orderScheduler.scheduleOrderStockRelease(order.id!);

      if (isFailure(scheduleResult)) {
        console.error(
          `Failed to schedule stock release for order ${order.id}: ${scheduleResult.error.message}`,
        );
      }

      return Result.success(order.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Usecase Error', error);
    }
  }
}
