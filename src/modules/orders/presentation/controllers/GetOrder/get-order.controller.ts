import { Injectable } from '@nestjs/common';
import { GetOrderUseCase } from '../../../application/use-cases/GetOrder/getOrder.usecase';
import { Order } from '../../../domain/entities/order';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class GetOrderController {
  constructor(private getOrderUseCase: GetOrderUseCase) {}
  async handle(id: number): Promise<Result<Order, ControllerError>> {
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
