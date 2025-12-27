import { Injectable } from '@nestjs/common';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { MergeCartsUseCase } from '../../../application/usecases/merge-carts/merge-carts.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';

@Injectable()
export class MergeCartsController {
  constructor(private readonly mergeCartsUseCase: MergeCartsUseCase) {}
  async handle(
    guestCartId: number,
    userCartId: number,
  ): Promise<Result<ICart, ControllerError>> {
    try {
      const result = await this.mergeCartsUseCase.execute({
        guestCartId,
        userCartId,
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
