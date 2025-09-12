import { Injectable } from '@nestjs/common';
import { CancelOrderUseCase } from '../../../application/usecases/CancelOrder/cancel-order.usecase';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { IOrder } from '../../../domain/interfaces/IOrder';

@Injectable()
export class CancelOrderController {
  constructor(private cancelOrderUseCase: CancelOrderUseCase) {}
  async handle(id: string): Promise<Result<IOrder, ControllerError>> {
    try {
      const cancelRequest = await this.cancelOrderUseCase.execute(id);
      if (cancelRequest.isFailure) return cancelRequest;
      return Result.success(cancelRequest.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
