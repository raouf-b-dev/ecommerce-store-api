import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { Order } from '../../../domain/entities/order';

@Injectable()
export class ConfirmOrderUseCase
  implements UseCase<string, IOrder, UseCaseError>
{
  constructor(private orderRepository: OrderRepository) {}
  async execute(id: string): Promise<Result<IOrder, UseCaseError>> {
    try {
      const requestedOrder = await this.orderRepository.findById(id);
      if (requestedOrder.isFailure) return requestedOrder;

      const order: Order = requestedOrder.value;
      if (!order.canBeConfirmed()) {
        return ErrorFactory.UseCaseError('Order is not in a confirmable state');
      }

      order.confirm();

      const confirmRequest = await this.orderRepository.updateStatus(
        order.id,
        order.status,
      );
      if (confirmRequest.isFailure) return confirmRequest;

      return Result.success(order.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Usecase Error', error);
    }
  }
}
