// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.ts
import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Order } from '../../../domain/entities/order';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { DeliverOrderDto } from '../../../../primary-adapters/dto/deliver-order.dto';
import { PaymentGateway } from '../../ports/payment.gateway';
import { PAYMENT_GATEWAY } from '../../../../order.token';

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
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
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
        const codPaymentResult = await this.paymentGateway.recordCodPayment({
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
