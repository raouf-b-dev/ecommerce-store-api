import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { OrderRepository } from '../../domain/repositories/order-repository';
import { Order } from '../../domain/entities/order';

export interface LinkDemoOrderPaymentItem {
  orderId: number;
  /** When set, associate this payment id; otherwise only refresh timestamps. */
  paymentId?: number;
  createdAt: Date;
}

export interface LinkedDemoOrderPayment {
  orderId: number;
  paymentId: number | null;
}

/**
 * Associates real payment ids (when provided) and refreshes demo order timestamps.
 */
@Injectable()
export class LinkDemoOrderPaymentsUseCase extends UseCase<
  LinkDemoOrderPaymentItem[],
  LinkedDemoOrderPayment[],
  UseCaseError
> {
  constructor(private readonly orderRepository: OrderRepository) {
    super();
  }

  async execute(
    items: LinkDemoOrderPaymentItem[],
  ): Promise<Result<LinkedDemoOrderPayment[], UseCaseError>> {
    const linked: LinkedDemoOrderPayment[] = [];

    for (const item of items) {
      const findResult = await this.orderRepository.findById(item.orderId);
      if (findResult.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to load order ${item.orderId} for payment link`,
          findResult.error,
        );
      }

      const primitives = findResult.value.toPrimitives();
      const paymentId = item.paymentId ?? primitives.paymentId;

      if (item.paymentId != null) {
        const associateResult = findResult.value.associatePayment(
          item.paymentId,
        );
        if (associateResult.isFailure) {
          return ErrorFactory.UseCaseError(
            `Failed to associate payment ${item.paymentId} with order ${item.orderId}`,
            associateResult.error,
          );
        }
      }

      const refreshed = Order.fromPrimitives({
        ...primitives,
        paymentId,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      });

      const saveResult = await this.orderRepository.save(refreshed);
      if (saveResult.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to save linked order ${item.orderId}`,
          saveResult.error,
        );
      }

      linked.push({ orderId: item.orderId, paymentId });
    }

    return Result.success(linked);
  }
}
