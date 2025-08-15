import { Injectable } from '@nestjs/common';
import { Product } from '../../../domain/entities/product';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { DeleteProductUseCase } from '../../../application/usecases/DeleteProduct/delete-product.usecase';

@Injectable()
export class DeleteProductController {
  constructor(private deleteProductUseCase: DeleteProductUseCase) {}
  async handle(id: number): Promise<Result<void, ControllerError>> {
    try {
      const deleteResult = await this.deleteProductUseCase.execute(id);
      if (isFailure(deleteResult)) {
        return ErrorFactory.ControllerError(
          'Controller failed to delete product',
          deleteResult.error,
        );
      }
      return Result.success(deleteResult.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
