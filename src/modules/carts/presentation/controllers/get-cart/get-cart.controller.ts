import { Injectable } from '@nestjs/common';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { GetCartUseCase } from '../../../application/usecases/get-cart/get-cart.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';

@Injectable()
export class GetCartController {
  constructor(private readonly getCartUseCase: GetCartUseCase) {}
  async handle(id: number): Promise<Result<ICart, ControllerError>> {
    try {
      const result = await this.getCartUseCase.execute(id);

      if (isFailure(result)) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
