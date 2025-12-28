import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { Order } from '../../../domain/entities/order';

@Injectable()
export class ShipOrderUseCase implements UseCase<number, IOrder, UseCaseError> {
  constructor(private orderRepository: OrderRepository) {}
  async execute(id: number): Promise<Result<IOrder, UseCaseError>> {
    try {
      const requestedOrder = await this.orderRepository.findById(id);
      if (requestedOrder.isFailure) return requestedOrder;

      const order: Order = requestedOrder.value;

      const shipResult = order.ship();
      if (shipResult.isFailure) return shipResult;

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
