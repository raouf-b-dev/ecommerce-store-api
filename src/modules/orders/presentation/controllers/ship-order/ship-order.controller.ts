import { Injectable } from '@nestjs/common';
import { ShipOrderUseCase } from '../../../application/usecases/ship-order/ship-order.usecase';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IOrder } from '../../../domain/interfaces/order.interface';

@Injectable()
export class ShipOrderController {
  constructor(private shipOrderUseCase: ShipOrderUseCase) {}
  async handle(id: string): Promise<Result<IOrder, ControllerError>> {
    try {
      const shipRequest = await this.shipOrderUseCase.execute(id);
      if (shipRequest.isFailure) return shipRequest;
      return Result.success(shipRequest.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
