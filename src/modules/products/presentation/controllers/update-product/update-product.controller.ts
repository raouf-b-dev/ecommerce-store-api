import { Injectable } from '@nestjs/common';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UpdateProductUseCase } from '../../../application/usecases/update-product/update-product.usecase';
import { UpdateProductDto } from '../../dto/update-product.dto';
import { IProduct } from '../../../domain/interfaces/product.interface';

@Injectable()
export class UpdateProductController {
  constructor(private updateProductUseCase: UpdateProductUseCase) {}
  async handle(
    id: string,
    dto: UpdateProductDto,
  ): Promise<Result<IProduct, ControllerError>> {
    try {
      const updateProductResult = await this.updateProductUseCase.execute({
        id,
        dto,
      });
      if (isFailure(updateProductResult)) {
        return ErrorFactory.ControllerError(
          'Controller failed to Update product',
          updateProductResult.error,
        );
      }
      return Result.success<IProduct>(updateProductResult.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
