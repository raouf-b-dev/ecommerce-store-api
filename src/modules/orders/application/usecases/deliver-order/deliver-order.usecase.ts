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
import { RecordCodPaymentUseCase } from '../../../../payments/application/usecases/record-cod-payment/record-cod-payment.usecase';

@Injectable()
export class DeliverOrderUseCase
  implements
    UseCase<
      { id: number; deliverOrderDto: DeliverOrderDto },
      IOrder,
      UseCaseError
    >
{
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly recordCodPaymentUseCase: RecordCodPaymentUseCase,
  ) {}

  async execute(input: {
    id: number;
    deliverOrderDto: DeliverOrderDto;
  }): Promise<Result<IOrder, UseCaseError>> {
    try {
      const requestedOrder = await this.orderRepository.findById(input.id);
      if (requestedOrder.isFailure) {
        return requestedOrder;
      }

      const order: Order = requestedOrder.value;

      if (order.isCOD() && input.deliverOrderDto.codPayment) {
        const codPaymentResult = await this.recordCodPaymentUseCase.execute({
          orderId: input.id,
          amountCollected: order.totalPrice,
          currency: 'USD',
          notes: input.deliverOrderDto.codPayment.notes,
          collectedBy: input.deliverOrderDto.codPayment.collectedBy,
        });
        if (codPaymentResult.isFailure) {
          return codPaymentResult;
        }

        const payment = codPaymentResult.value;
        if (payment.id) {
          await this.orderRepository.updatePaymentId(input.id, payment.id);
        }
      }

      const deliverResult = order.deliver();
      if (deliverResult.isFailure) return deliverResult;

      const updateResult = await this.orderRepository.updateStatus(
        input.id,
        order.status,
      );
      if (updateResult.isFailure) {
        return updateResult;
      }

      return Result.success(order.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Usecase Error', error);
    }
  }
}
