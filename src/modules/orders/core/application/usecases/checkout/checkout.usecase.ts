import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ShippingAddressInput } from '../../services/shipping-address-resolver';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { OrderStatus } from '../../../domain/value-objects/order-status';

export interface CheckoutCommand {
  cartId: number;
  paymentMethod: PaymentMethodType;
  shippingAddress?: ShippingAddressInput;
  customerNotes?: string;
}

export interface CheckoutResult {
  orderId: number;
  jobId: string;
  status: OrderStatus;
  message: string;
}
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { PaymentMethodPolicy } from '../../../domain/services/payment-method-policy';
import { ValidateCheckoutUseCase } from '../validate-checkout/validate-checkout.usecase';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

@Injectable()
export class CheckoutUseCase extends UseCase<
  { command: CheckoutCommand; userId: number },
  CheckoutResult,
  UseCaseError
> {
  private readonly logger = new Logger(CheckoutUseCase.name);

  constructor(
    private readonly orderScheduler: OrderScheduler,
    private readonly orderRepository: OrderRepository,
    private readonly orderFactory: OrderFactory,
    private readonly paymentPolicy: PaymentMethodPolicy,
    private readonly validateCheckoutUseCase: ValidateCheckoutUseCase,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {
    super();
  }

  async execute(input: {
    command: CheckoutCommand;
    userId: number;
  }): Promise<Result<CheckoutResult, UseCaseError>> {
    const { command, userId } = input;

    // 1. Validate Checkout Context (Customer, Cart, Address)
    const validationResult = await this.validateCheckoutUseCase.execute({
      cartId: command.cartId,
      userId,
      shippingAddress: command.shippingAddress,
    });

    if (isFailure(validationResult)) {
      return Result.failure(validationResult.error);
    }

    this.domainEventPublisher.publish('cart.checkout.initiated', {
      cartId: command.cartId,
      userId,
    });

    const { cart, shippingAddress } = validationResult.value;

    // 2. Create Order Synchronously (to generate ID)
    const order = this.orderFactory.createFromCart({
      cart,
      userId,
      shippingAddress,
      paymentMethod: command.paymentMethod,
      customerNotes: command.customerNotes,
      orderId: null, // Let DB generate ID
    });

    const saveResult = await this.orderRepository.save(order);
    if (isFailure(saveResult)) {
      return Result.failure(saveResult.error);
    }
    const savedOrder = saveResult.value;
    const orderId = savedOrder.id!;

    this.domainEventPublisher.publish('order.created', { orderId, userId });

    // 3. Schedule Checkout Flow
    const scheduleResult = await this.orderScheduler.scheduleCheckout({
      cartId: command.cartId,
      userId,
      shippingAddress,
      paymentMethod: command.paymentMethod,
      customerNotes: command.customerNotes,
      orderId,
    });

    if (isFailure(scheduleResult)) {
      this.logger.error(
        `Scheduling failed for order ${orderId}. Cancelling order...`,
        scheduleResult.error,
      );
      await this.orderRepository.cancelOrder(savedOrder);
      return Result.failure(scheduleResult.error);
    }

    const flowId = scheduleResult.value;

    // 4. Build Response (using domain policy for message)
    const response: CheckoutResult = {
      orderId,
      jobId: flowId,
      status: savedOrder.status,
      message: this.paymentPolicy.getCheckoutMessage(command.paymentMethod),
    };

    return Result.success(response);
  }
}
