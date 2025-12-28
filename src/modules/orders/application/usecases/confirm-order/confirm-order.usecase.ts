import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { Order } from '../../../domain/entities/order';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';

export interface ConfirmOrderDto {
  orderId: number;
  reservationId?: number;
  cartId?: number;
}

@Injectable()
export class ConfirmOrderUseCase
  implements UseCase<ConfirmOrderDto, IOrder, UseCaseError>
{
  private readonly logger = new Logger(ConfirmOrderUseCase.name);

  constructor(
    private orderRepository: OrderRepository,
    private orderScheduler: OrderScheduler,
  ) {}

  async execute(dto: ConfirmOrderDto): Promise<Result<IOrder, UseCaseError>> {
    try {
      const { orderId, reservationId, cartId } = dto;
      const requestedOrder = await this.orderRepository.findById(orderId);
      if (requestedOrder.isFailure) return requestedOrder;

      const order: Order = requestedOrder.value;

      let confirmResult;
      if (order.isCOD()) {
        confirmResult = order.confirm();
      } else {
        if (!order.hasPayment()) {
          return ErrorFactory.DomainError(
            'Cannot confirm order - payment must be completed first',
          );
        }
        confirmResult = order.confirmPayment(order.paymentId!);
      }

      if (confirmResult.isFailure) return confirmResult;

      const updateResult = await this.orderRepository.updateStatus(
        orderId,
        order.status,
      );
      if (updateResult.isFailure) return updateResult;

      // For COD orders, trigger post-confirmation flow
      if (order.isCOD() && reservationId && cartId) {
        const scheduleResult =
          await this.orderScheduler.schedulePostConfirmation(
            orderId,
            reservationId,
            cartId,
          );

        if (isFailure(scheduleResult)) {
          this.logger.error(
            `Failed to schedule post-confirmation flow for order ${orderId}. ` +
              `Manual intervention may be required.`,
            scheduleResult.error,
          );
        } else {
          this.logger.log(
            `Post-confirmation flow scheduled for order ${orderId}`,
          );
        }
      } else if (order.isCOD()) {
        this.logger.warn(
          `Missing reservationId or cartId for COD order ${orderId}. ` +
            `Post-confirmation flow not scheduled.`,
        );
      }

      return Result.success(order.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected Usecase Error', error);
    }
  }
}
