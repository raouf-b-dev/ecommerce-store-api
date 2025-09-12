import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';

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
