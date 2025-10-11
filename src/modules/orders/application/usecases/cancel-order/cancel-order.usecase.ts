import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Order } from '../../../domain/entities/order';

@Injectable()
export class CancelOrderUseCase
  implements UseCase<string, IOrder, UseCaseError>
{
  constructor(private orderRepository: OrderRepository) {}
  async execute(id: string): Promise<Result<IOrder, UseCaseError>> {
    try {
      const requestedOrder = await this.orderRepository.findById(id);
      if (requestedOrder.isFailure) return requestedOrder;

      const order: Order = requestedOrder.value;
      if (!order.isCancellable()) {
        return ErrorFactory.UseCaseError('Order is not in a cancellable state');
      }

      order.cancel();

      const cancelRequest = await this.orderRepository.cancelOrder(
        order.toPrimitives(),
      );
      if (cancelRequest.isFailure) return cancelRequest;

      return Result.success(order.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Usecase Error', error);
    }
  }
}
