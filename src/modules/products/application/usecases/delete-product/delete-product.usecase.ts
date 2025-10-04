// src/modules/Products/application/usecases/DeleteProduct/delete-Product.usecase.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class DeleteProductUseCase extends UseCase<string, void, UseCaseError> {
  constructor(private readonly productRepository: ProductRepository) {
    super();
  }

  async execute(id: string): Promise<Result<void, UseCaseError>> {
    try {
      const productResult = await this.productRepository.deleteById(id);

      if (isFailure(productResult)) {
        return ErrorFactory.UseCaseError(productResult.error.message);
      }

      return Result.success(productResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
