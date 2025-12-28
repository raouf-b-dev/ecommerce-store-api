import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { ValidateCheckoutUseCase } from '../../application/usecases/validate-checkout/validate-checkout.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';
import { ShippingAddressDto } from '../dto/shipping-address.dto';

export interface ValidateCartResult {
  cartId: number;
  cartItems: Array<{ productId: number; quantity: number; price: number }>;
}

@Injectable()
export class ValidateCartStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ValidateCartResult
> {
  protected readonly logger = new Logger(ValidateCartStep.name);

  constructor(
    private readonly validateCheckoutUseCase: ValidateCheckoutUseCase,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ValidateCartResult, AppError>> {
    const { cartId, userId, shippingAddress } = job.data;
    this.logger.log(`Validating checkout context for cart ${cartId}...`);

    const validationResult = await this.validateCheckoutUseCase.execute({
      cartId,
      userId,
      shippingAddress: shippingAddress
        ? ShippingAddressDto.fromDomain(shippingAddress)
        : undefined,
    });

    if (isFailure(validationResult)) {
      return Result.failure(validationResult.error);
    }

    const { cart } = validationResult.value;

    this.logger.log(
      `Cart ${cartId} validated with ${cart.items.length} items.`,
    );

    return Result.success({
      cartId,
      cartItems: cart.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
      })),
    });
  }
}
