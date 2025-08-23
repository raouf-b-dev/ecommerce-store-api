import { Injectable } from '@nestjs/common';
import { GetOrderUseCase } from '../../../application/use-cases/GetOrder/getOrder.usecase';
import { Order } from '../../../domain/entities/Order';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IOrder } from '../../../domain/interfaces/IOrder';

@Injectable()
export class GetOrderController {
  constructor(private getOrderUseCase: GetOrderUseCase) {}
  async handle(id: string): Promise<Result<IOrder, ControllerError>> {
    try {
      const orderResult = await this.getOrderUseCase.execute(id);
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
