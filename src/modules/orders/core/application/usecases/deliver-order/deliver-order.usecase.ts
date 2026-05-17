// src/modules/orders/application/usecases/deliver-order/deliver-order.usecase.ts
import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Order } from '../../../domain/entities/order';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { PaymentGateway } from '../../ports/payment.gateway';
import { PAYMENT_GATEWAY } from '../../../../order.token';

export interface DeliverOrderCommand {
  codPayment?: {
    transactionId?: string;
    notes?: string;
    collectedBy?: string;
  };
}

@Injectable()
export class DeliverOrderUseCase
  implements
    UseCase<{ id: number; command: DeliverOrderCommand }, IOrder, UseCaseError>
{
  constructor(
    private readonly orderRepository: OrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: {
    id: number;
    command: DeliverOrderCommand;
  }): Promise<Result<IOrder, UseCaseError>> {
    const requestedOrder = await this.orderRepository.findById(input.id);
    if (requestedOrder.isFailure) {
      return requestedOrder;
    }

    const order: Order = requestedOrder.value;

    if (order.isCOD() && input.command.codPayment) {
      const codPaymentResult = await this.paymentGateway.recordCodPayment({
        orderId: input.id,
        amountCollected: order.totalPrice,
        currency: 'USD',
        notes: input.command.codPayment.notes,
        collectedBy: input.command.codPayment.collectedBy,
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
  }
}
