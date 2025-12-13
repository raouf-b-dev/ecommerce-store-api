import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobHandler } from '../../../../core/infrastructure/jobs/base-job.handler';
import { GetCartUseCase } from '../../../carts/application/usecases/get-cart/get-cart.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { AppError } from '../../../../core/errors/app.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { ScheduleCheckoutProps } from '../../domain/schedulers/order.scheduler';

export interface ValidateCartResult {
  cartId: string;
  cartItems: Array<{ productId: string; quantity: number; price: number }>;
}

@Injectable()
export class ValidateCartStep extends BaseJobHandler<
  ScheduleCheckoutProps,
  ValidateCartResult
> {
  protected readonly logger = new Logger(ValidateCartStep.name);

  constructor(private readonly getCartUseCase: GetCartUseCase) {
    super();
  }

  protected async onExecute(
    job: Job<ScheduleCheckoutProps>,
  ): Promise<Result<ValidateCartResult, AppError>> {
    const { cartId } = job.data;
    this.logger.log(`Validating cart ${cartId} for checkout...`);

    const cartResult = await this.getCartUseCase.execute(cartId);
    if (isFailure(cartResult)) {
      return Result.failure(cartResult.error);
    }

    const cart = cartResult.value;

    if (cart.items.length === 0) {
      return ErrorFactory.ServiceError('Cart is empty');
    }

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
