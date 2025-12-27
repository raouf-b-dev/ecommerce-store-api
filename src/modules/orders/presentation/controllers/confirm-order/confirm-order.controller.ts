import { Injectable } from '@nestjs/common';
import {
  ConfirmOrderUseCase,
  ConfirmOrderDto,
} from '../../../application/usecases/confirm-order/confirm-order.usecase';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IOrder } from '../../../domain/interfaces/order.interface';

@Injectable()
export class ConfirmOrderController {
  constructor(private confirmOrderUseCase: ConfirmOrderUseCase) {}

  async handle(
    orderId: number,
    reservationId?: number,
    cartId?: number,
  ): Promise<Result<IOrder, ControllerError>> {
    try {
      const dto: ConfirmOrderDto = { orderId, reservationId, cartId };
      const confirmRequest = await this.confirmOrderUseCase.execute(dto);
      if (confirmRequest.isFailure) return confirmRequest;
      return Result.success(confirmRequest.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
