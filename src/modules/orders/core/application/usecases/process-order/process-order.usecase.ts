import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';

@Injectable()
export class ProcessOrderUseCase
  implements UseCase<number, IOrder, UseCaseError>
{
  constructor(private orderRepository: OrderRepository) {}
  async execute(id: number): Promise<Result<IOrder, UseCaseError>> {
    const orderResult = await this.orderRepository.findByIdForUpdate(id);
    if (orderResult.isFailure) return orderResult;

    const { entity: order, expectedVersion } = orderResult.value;

    const processResult = order.process();
    if (processResult.isFailure) return processResult;

    const updateResult = await this.orderRepository.save(
      order,
      expectedVersion,
    );
    if (updateResult.isFailure) return updateResult;

    return Result.success(order.toPrimitives());
  }
}
