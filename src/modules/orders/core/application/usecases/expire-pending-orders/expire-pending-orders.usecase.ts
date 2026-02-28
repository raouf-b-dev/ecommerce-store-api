import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CancelOrderUseCase } from '../cancel-order/cancel-order.usecase';

export interface ExpirePendingOrdersDto {
  expirationMinutes: number;
}

export interface ExpirePendingOrdersResult {
  cancelledCount: number;
  failedCount: number;
}

@Injectable()
export class ExpirePendingOrdersUseCase
  implements
    UseCase<ExpirePendingOrdersDto, ExpirePendingOrdersResult, UseCaseError>
{
  private readonly logger = new Logger(ExpirePendingOrdersUseCase.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  async execute(
    dto: ExpirePendingOrdersDto,
  ): Promise<Result<ExpirePendingOrdersResult, UseCaseError>> {
    try {
      const expirationTime = new Date(
        Date.now() - dto.expirationMinutes * 60 * 1000,
      );

      const pendingOrdersResult = await this.orderRepository.findByStatusBefore(
        OrderStatus.PENDING_PAYMENT,
        expirationTime,
      );

      if (isFailure(pendingOrdersResult)) {
        return ErrorFactory.UseCaseError(
          'Failed to fetch pending orders',
          pendingOrdersResult.error,
        );
      }

      const pendingOrders = pendingOrdersResult.value;
      let cancelledCount = 0;
      let failedCount = 0;

      this.logger.log(
        `Found ${pendingOrders.length} orders pending for more than ${dto.expirationMinutes} minutes`,
      );

      for (const order of pendingOrders) {
        if (!order.id) continue;

        const cancelResult = await this.cancelOrderUseCase.execute(order.id);

        if (isFailure(cancelResult)) {
          this.logger.error(
            `Failed to cancel expired order ${order.id}: ${cancelResult.error.message}`,
          );
          failedCount++;
          continue;
        }

        this.logger.log(`Expired order ${order.id} cancelled successfully`);
        cancelledCount++;
      }

      return Result.success({ cancelledCount, failedCount });
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error while expiring pending orders',
        error,
      );
    }
  }
}
