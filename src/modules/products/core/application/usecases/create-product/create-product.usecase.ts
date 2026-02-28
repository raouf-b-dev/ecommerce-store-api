// src/modules/Products/application/usecases/CreateProduct/Create-Product.usecase.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CreateProductDto } from '../../../../primary-adapters/dto/create-product.dto';
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
