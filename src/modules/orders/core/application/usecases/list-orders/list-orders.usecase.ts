import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { ListOrdersQueryDto } from '../../../../primary-adapters/dto/list-orders-query.dto';

@Injectable()
export class ListOrdersUsecase
  implements UseCase<ListOrdersQueryDto, IOrder[], UseCaseError>
{
  constructor(private orderRepository: OrderRepository) {}
  async execute(
    dto: ListOrdersQueryDto,
  ): Promise<Result<IOrder[], UseCaseError>> {
    try {
      const ordersResult = await this.orderRepository.listOrders(dto);
      if (ordersResult.isFailure) {
        return ordersResult;
      }

      return Result.success(ordersResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Error Occured', error);
    }
  }
}
