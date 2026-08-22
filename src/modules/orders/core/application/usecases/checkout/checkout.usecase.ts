import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { ValidateCheckoutUseCase } from '../validate-checkout/validate-checkout.usecase';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { CheckoutCommand } from '../../commands/checkout.command';
import { CheckoutResult } from '../../queries/results/checkout.result';

@Injectable()
export class CheckoutUseCase extends UseCase<
  CheckoutCommand,
  CheckoutResult,
  UseCaseError
> {
  private readonly logger = new Logger(CheckoutUseCase.name);

  constructor(
    private readonly orderScheduler: OrderScheduler,
    private readonly orderRepository: OrderRepository,
    private readonly orderFactory: OrderFactory,
    private readonly validateCheckoutUseCase: ValidateCheckoutUseCase,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {
    super();
  }

  async execute(
    command: CheckoutCommand,
  ): Promise<Result<CheckoutResult, UseCaseError>> {
    const { callerContext } = command;

    const validationResult = await this.validateCheckoutUseCase.execute({
      cartId: command.cartId,
      callerContext,
      shippingAddress: command.shippingAddress,
    });

    if (isFailure(validationResult)) {
      return Result.failure(validationResult.error);
    }

    const { cart, shippingAddress, userId } = validationResult.value;

    this.domainEventPublisher.publish('cart.checkout.initiated', {
      cartId: command.cartId,
      userId,
    });

    const order = this.orderFactory.createFromCart({
      cart,
      userId,
      shippingAddress,
      paymentMethod: command.paymentMethod,
      userNotes: command.customerNotes,
      orderId: null,
    });

    const saveResult = await this.orderRepository.save(order);
    if (isFailure(saveResult)) {
      return Result.failure(saveResult.error);
    }
    const orderId = saveResult.value.id;

    this.domainEventPublisher.publish('order.created', { orderId, userId });

    const scheduleResult = await this.orderScheduler.scheduleCheckout({
      cartId: command.cartId,
      userId,
      shippingAddress,
      paymentMethod: command.paymentMethod,
      customerNotes: command.customerNotes,
      orderId: orderId!,
      flowId: `checkout-${orderId}-${Date.now()}`,
    });

    if (isFailure(scheduleResult)) {
      this.logger.error(
        `Scheduling failed for order ${orderId}. Cancelling order...`,
        scheduleResult.error,
      );
      order.cancel();
      await this.orderRepository.save(order);
      return Result.failure(scheduleResult.error);
    }

    const flowId = scheduleResult.value;

    const response: CheckoutResult = {
      orderId: orderId!,
      jobId: flowId,
      status: order.status,
      message:
        'Checkout initiated. Please check order status for payment details.',
    };

    return Result.success(response);
  }
}
