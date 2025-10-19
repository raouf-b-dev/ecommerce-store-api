// src/modules/Products/application/usecases/GetProduct/get-Product.usecase.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IProduct } from '../../../domain/interfaces/product.interface';

@Injectable()
export class GetProductUseCase extends UseCase<string, IProduct, UseCaseError> {
  constructor(private readonly productRepository: ProductRepository) {
    super();
  }

  async execute(id: string): Promise<Result<IProduct, UseCaseError>> {
    try {
      const productResult = await this.productRepository.findById(id);

      if (isFailure(productResult)) {
        return ErrorFactory.UseCaseError(`Product with id ${id} not found`);
      }

      return Result.success(productResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
