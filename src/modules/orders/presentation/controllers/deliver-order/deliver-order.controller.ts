import { Injectable } from '@nestjs/common';
import { DeliverOrderUseCase } from '../../../application/usecases/deliver-order/deliver-order.usecase';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { DeliverOrderDto } from '../../dto/deliver-order.dto';

@Injectable()
export class DeliverOrderController {
  constructor(private deliverOrderUseCase: DeliverOrderUseCase) {}
  async handle(
    id: string,
    deliverOrderDto: DeliverOrderDto,
  ): Promise<Result<IOrder, ControllerError>> {
    try {
      const deliverRequest = await this.deliverOrderUseCase.execute({
        id,
        deliverOrderDto,
      });
      if (deliverRequest.isFailure) return deliverRequest;
      return Result.success(deliverRequest.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
