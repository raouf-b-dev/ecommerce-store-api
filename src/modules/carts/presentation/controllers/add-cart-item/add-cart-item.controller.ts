import { Injectable } from '@nestjs/common';
import { AddCartItemDto } from '../../dto/add-cart-item.dto';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { AddCartItemUseCase } from '../../../application/usecases/add-cart-item/add-cart-item.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';

@Injectable()
export class AddCartItemController {
  constructor(private readonly addCartItemUseCase: AddCartItemUseCase) {}
  async handle(
    id: number,
    dto: AddCartItemDto,
  ): Promise<Result<ICart, ControllerError>> {
    try {
      const result = await this.addCartItemUseCase.execute({
        cartId: id,
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
