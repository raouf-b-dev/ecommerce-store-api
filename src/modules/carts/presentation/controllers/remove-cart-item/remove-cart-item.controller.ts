import { Injectable } from '@nestjs/common';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RemoveCartItemUseCase } from '../../../application/usecases/remove-cart-item/remove-cart-item.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';

@Injectable()
export class RemoveCartItemController {
  constructor(private readonly removeCartItemUseCase: RemoveCartItemUseCase) {}
  async handle(
    id: number,
    itemId: number,
  ): Promise<Result<ICart, ControllerError>> {
    try {
      const result = await this.removeCartItemUseCase.execute({
        cartId: id,
        itemId,
      });

      if (isFailure(result)) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
