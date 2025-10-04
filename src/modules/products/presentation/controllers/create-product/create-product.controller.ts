import { Injectable } from '@nestjs/common';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CreateProductUseCase } from '../../../application/usecases/create-product/create-product.usecase';
import { CreateProductDto } from '../../dto/create-product.dto';
import { Product } from '../../../domain/entities/product';

@Injectable()
export class CreateProductController {
  constructor(private createProductUseCase: CreateProductUseCase) {}
  async handle(
    dto: CreateProductDto,
  ): Promise<Result<Product, ControllerError>> {
    try {
      const productResult = await this.createProductUseCase.execute(dto);
      if (isFailure(productResult)) {
        return ErrorFactory.ControllerError(
          'Controller failed to create product',
          productResult.error,
        );
      }
      return Result.success<Product>(productResult.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected controller error', error);
    }
  }
}
