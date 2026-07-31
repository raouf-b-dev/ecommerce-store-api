// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Order } from '../../../domain/entities/order';
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
    const requestedOrder = await this.orderRepository.findById(input.id);
    if (requestedOrder.isFailure) {
      return requestedOrder;
    }

    const order: Order = requestedOrder.value;

    const deliverResult = order.deliver();
    if (deliverResult.isFailure) return deliverResult;

    const updateResult = await this.orderRepository.updateStatus(
      input.id,
      order.status,
    );
    if (updateResult.isFailure) {
      return updateResult;
    }

    return Result.success(order.toPrimitives());
  }
}
