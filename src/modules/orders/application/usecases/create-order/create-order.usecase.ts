// src/modules/Orders/application/usecases/CreateOrder/Create-Order.usecase.ts
import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CreateOrderDto } from '../../../presentation/dto/create-order.dto';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderFactory } from '../../../domain/factories/order.factory';

@Injectable()
export class CreateOrderUseCase extends UseCase<
  CreateOrderDto,
  IOrder,
  UseCaseError
> {
  constructor(
    private readonly orderFactory: OrderFactory,
    private readonly orderRepository: OrderRepository,
  ) {
    super();
  }

  async execute(dto: CreateOrderDto): Promise<Result<IOrder, UseCaseError>> {
    try {
      const cleanAndAggregatedDto = this.orderFactory.createFromDto(dto);

      const orderResult = await this.orderRepository.save(
        cleanAndAggregatedDto,
      );

      if (isFailure(orderResult)) {
        return ErrorFactory.UseCaseError(orderResult.error.message);
      }

      return Result.success<IOrder>(orderResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
