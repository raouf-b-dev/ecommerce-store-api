import { Injectable } from '@nestjs/common';
import { Product } from '../../../domain/entities/product';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { GetProductUseCase } from '../../../application/usecases/GetProduct/get-product.usecase';

@Injectable()
export class GetProductController {
  constructor(private getProductUseCase: GetProductUseCase) {}
  async handle(id: number): Promise<Result<Product, ControllerError>> {
    try {
      const productResult = await this.getProductUseCase.execute(id);
      if (isFailure(productResult)) {
        return ErrorFactory.ControllerError(
          'Controller failed to get product',
          productResult.error,
        );
      }
      return Result.success(productResult.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
