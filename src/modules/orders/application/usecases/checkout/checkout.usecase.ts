import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CheckoutDto } from '../../../presentation/dto/checkout.dto';
import { CheckoutResponseDto } from '../../../presentation/dto/checkout-response.dto';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { PaymentMethodPolicy } from '../../../domain/services/payment-method-policy';
import { ValidateCheckoutUseCase } from '../validate-checkout/validate-checkout.usecase';

@Injectable()
export class CheckoutUseCase extends UseCase<
  { dto: CheckoutDto; userId: number },
  CheckoutResponseDto,
  UseCaseError
> {
  private readonly logger = new Logger(CheckoutUseCase.name);

  constructor(
    private readonly orderScheduler: OrderScheduler,
    private readonly orderRepository: OrderRepository,
    private readonly orderFactory: OrderFactory,
    private readonly paymentPolicy: PaymentMethodPolicy,
    private readonly validateCheckoutUseCase: ValidateCheckoutUseCase,
  ) {
    super();
  }

  async execute(input: {
    dto: CheckoutDto;
    userId: number;
  }): Promise<Result<CheckoutResponseDto, UseCaseError>> {
    const { dto, userId } = input;

    try {
      // 1. Validate Checkout Context (Customer, Cart, Address)
      const validationResult = await this.validateCheckoutUseCase.execute({
        cartId: dto.cartId,
        userId,
        shippingAddress: dto.shippingAddress,
      });

      if (isFailure(validationResult)) {
        return Result.failure(validationResult.error);
      }

      const { cart, shippingAddress } = validationResult.value;

      // 2. Create Order Synchronously (to generate ID)
      const order = this.orderFactory.createFromCart({
        cart,
        userId,
        shippingAddress,
        paymentMethod: dto.paymentMethod,
        customerNotes: dto.customerNotes,
        orderId: null, // Let DB generate ID
      });

      const saveResult = await this.orderRepository.save(order);
      if (isFailure(saveResult)) {
        return Result.failure(saveResult.error);
      }
      const savedOrder = saveResult.value;
      const orderId = savedOrder.id!;

      // 3. Schedule Checkout Flow
      const scheduleResult = await this.orderScheduler.scheduleCheckout({
        cartId: dto.cartId,
        userId,
        shippingAddress,
        paymentMethod: dto.paymentMethod,
        customerNotes: dto.customerNotes,
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
      const response: CheckoutResponseDto = {
        orderId,
        jobId: flowId,
        status: savedOrder.status,
        message: this.paymentPolicy.getCheckoutMessage(dto.paymentMethod),
      };

      return Result.success(response);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected checkout error', error);
    }
  }
}
