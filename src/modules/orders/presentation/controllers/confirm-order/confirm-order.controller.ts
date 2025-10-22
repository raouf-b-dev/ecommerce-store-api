import { Injectable } from '@nestjs/common';
import { ConfirmOrderUseCase } from '../../../application/usecases/confirm-order/confirm-order.usecase';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IOrder } from '../../../domain/interfaces/order.interface';

@Injectable()
export class ConfirmOrderController {
  constructor(private confirmOrderUseCase: ConfirmOrderUseCase) {}
  async handle(id: string): Promise<Result<IOrder, ControllerError>> {
    try {
      const cancelRequest = await this.confirmOrderUseCase.execute(id);
      if (cancelRequest.isFailure) return cancelRequest;
      return Result.success(cancelRequest.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
