import { Injectable } from '@nestjs/common';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CreateOrderUseCase } from '../../../application/usecases/create-order/create-order.usecase';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { IOrder } from '../../../domain/interfaces/order.interface';

@Injectable()
export class CreateOrderController {
  constructor(private createOrderUseCase: CreateOrderUseCase) {}
  async handle(dto: CreateOrderDto): Promise<Result<IOrder, ControllerError>> {
    try {
      const orderResult = await this.createOrderUseCase.execute(dto);
      if (isFailure(orderResult)) {
        return ErrorFactory.ControllerError(
          'Controller failed to create Order',
          orderResult.error,
        );
      }
      return Result.success<IOrder>(orderResult.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
