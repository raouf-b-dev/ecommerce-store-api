// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { Order } from '../../../domain/entities/order';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { DeliverOrderDto } from '../../../presentation/dto/deliver-order.dto';

@Injectable()
export class DeliverOrderUseCase
  implements
    UseCase<
      { id: string; deliverOrderDto: DeliverOrderDto },
      IOrder,
      UseCaseError
    >
{
  constructor(private orderRepository: OrderRepository) {}

  async execute(input: {
    id: string;
    deliverOrderDto: DeliverOrderDto;
  }): Promise<Result<IOrder, UseCaseError>> {
    try {
      const requestedOrder = await this.orderRepository.findById(input.id);
      if (requestedOrder.isFailure) {
        return requestedOrder;
      }

      const order: Order = requestedOrder.value;

      // Check if order can be delivered before calling deliver()
      if (!order.canBeDelivered()) {
        return ErrorFactory.UseCaseError(
          'Order cannot be delivered in current state',
        );
      }

      // Now safe to call deliver()
      order.deliver({
        notes: input.deliverOrderDto.codPayment?.notes,
        transactionId: input.deliverOrderDto.codPayment?.transactionId,
      });

      const deliverRequest = await this.orderRepository.updateStatus(
        order.id,
        order.status,
      );
      if (deliverRequest.isFailure) {
        return deliverRequest;
      }

      return Result.success(order.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Usecase Error', error);
    }
  }
}
