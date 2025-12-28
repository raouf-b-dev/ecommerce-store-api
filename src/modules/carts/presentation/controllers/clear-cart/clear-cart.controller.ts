import { Injectable } from '@nestjs/common';
import { Result, isFailure } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ClearCartUseCase } from '../../../application/usecases/clear-cart/clear-cart.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';

@Injectable()
export class ClearCartController {
  constructor(private readonly clearCartUseCase: ClearCartUseCase) {}
  async handle(id: number): Promise<Result<ICart, ControllerError>> {
    try {
      const result = await this.clearCartUseCase.execute(id);

      if (isFailure(result)) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
