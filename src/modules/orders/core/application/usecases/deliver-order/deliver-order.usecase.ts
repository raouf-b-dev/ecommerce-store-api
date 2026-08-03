// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';

export interface DeliverOrderCommand {
  notes?: string;
}

@Injectable()
export class DeliverOrderUseCase
  implements
    UseCase<{ id: number; command?: DeliverOrderCommand }, IOrder, UseCaseError>
{
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(input: {
    id: number;
    command?: DeliverOrderCommand;
  }): Promise<Result<IOrder, UseCaseError>> {
    const requestedOrder = await this.orderRepository.findByIdForUpdate(
      input.id,
    );
    if (requestedOrder.isFailure) {
      return requestedOrder;
    }

    const { entity: order, expectedVersion } = requestedOrder.value;

    const deliverResult = order.deliver();
    if (deliverResult.isFailure) return deliverResult;

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) {
      return updateResult;
    }

    return Result.success(order.toPrimitives());
  }
}
