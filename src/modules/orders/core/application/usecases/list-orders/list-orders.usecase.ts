import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ListOrdersQuery } from '../../../domain/repositories/order-repository';

@Injectable()
export class ListOrdersUsecase
  implements UseCase<ListOrdersQuery, IOrder[], UseCaseError>
{
  constructor(private orderRepository: OrderRepository) {}
  async execute(dto: ListOrdersQuery): Promise<Result<IOrder[], UseCaseError>> {
    const ordersResult = await this.orderRepository.listOrders(dto);
    if (ordersResult.isFailure) {
      return ordersResult;
    }

    return Result.success(ordersResult.value);
  }
}
