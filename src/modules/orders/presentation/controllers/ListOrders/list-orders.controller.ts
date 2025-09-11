import { Injectable } from '@nestjs/common';
import { isFailure, Result } from '../../../../../core/domain/result';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ListOrdersUsecase } from '../../../application/usecases/ListOrders/list-orders.usecase';
import { ListOrdersQueryDto } from '../../dto/list-orders-query.dto';

@Injectable()
export class ListOrdersController {
  constructor(private listOrdersUsecase: ListOrdersUsecase) {}
  async handle(
    dto: ListOrdersQueryDto,
  ): Promise<Result<IOrder[], ControllerError>> {
    try {
      const orderResult = await this.listOrdersUsecase.execute(dto);
      if (isFailure(orderResult)) {
        return ErrorFactory.ControllerError(
          'Controller failed to get order',
          orderResult.error,
        );
      }
      return Result.success(orderResult.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
