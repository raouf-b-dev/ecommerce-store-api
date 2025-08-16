// src/modules/Products/application/usecases/UpdateProduct/Update-Product.usecase.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';
import { Product } from '../../../domain/entities/product';

@Injectable()
export class UpdateProductUseCase extends UseCase<
  { id: number; dto: UpdateProductDto },
  Product,
  UseCaseError
> {
  constructor(private readonly productRepository: ProductRepository) {
    super();
  }

  async execute(input: {
    id: number;
    dto: UpdateProductDto;
  }): Promise<Result<Product, UseCaseError>> {
    try {
      const { id, dto } = input;
      const productResult = await this.productRepository.update(id, dto);

      if (isFailure(productResult)) {
        return ErrorFactory.UseCaseError(productResult.error.message);
      }

      return Result.success<Product>(productResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
