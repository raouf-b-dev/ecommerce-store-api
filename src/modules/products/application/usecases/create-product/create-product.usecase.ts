// src/modules/Products/application/usecases/CreateProduct/Create-Product.usecase.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';
import { IProduct } from '../../../domain/interfaces/product.interface';

@Injectable()
export class CreateProductUseCase extends UseCase<
  CreateProductDto,
  IProduct,
  UseCaseError
> {
  constructor(private readonly productRepository: ProductRepository) {
    super();
  }

  async execute(
    dto: CreateProductDto,
  ): Promise<Result<IProduct, UseCaseError>> {
    try {
      const productResult = await this.productRepository.save(dto);

      if (isFailure(productResult)) {
        return ErrorFactory.UseCaseError(productResult.error.message);
      }

      return Result.success<IProduct>(productResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
