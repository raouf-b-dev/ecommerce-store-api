import { Injectable } from '@nestjs/common';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ListProductsUseCase } from '../../../application/usecases/list-products/list-products.usecase';
import { IProduct } from '../../../domain/interfaces/product.interface';

@Injectable()
export class ListProductsController {
  constructor(private listProductsUseCase: ListProductsUseCase) {}
  async handle(): Promise<Result<IProduct[], ControllerError>> {
    try {
      const productsResult = await this.listProductsUseCase.execute();
      if (isFailure(productsResult)) {
        return ErrorFactory.ControllerError(
          'Controller failed to get products',
          productsResult.error,
        );
      }
      return Result.success(productsResult.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
