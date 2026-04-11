import { Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { CartGateway } from '../../ports/cart.gateway';

@Injectable()
export class ClearCheckoutCartUseCase
  implements UseCase<number, void, UseCaseError>
{
  constructor(private readonly cartGateway: CartGateway) {}

  async execute(cartId: number): Promise<Result<void, UseCaseError>> {
    const result = await this.cartGateway.clearCart(cartId);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to clear checkout cart',
        result.error,
      );
    }

    return Result.success(undefined);
  }
}
