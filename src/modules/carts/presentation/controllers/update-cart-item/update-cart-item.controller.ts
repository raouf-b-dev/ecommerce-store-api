import { Injectable } from '@nestjs/common';
import { UpdateCartItemDto } from '../../dto/update-cart-item.dto';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UpdateCartItemUseCase } from '../../../application/usecases/update-cart-item/update-cart-item.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';

@Injectable()
export class UpdateCartItemController {
  constructor(private readonly updateCartItemUseCase: UpdateCartItemUseCase) {}
  async handle(
    id: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Result<ICart, ControllerError>> {
    try {
      const result = await this.updateCartItemUseCase.execute({
        cartId: id,
        itemId,
        dto,
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
