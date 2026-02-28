// src/modules/Products/application/usecases/UpdateProduct/Update-Product.usecase.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UpdateProductDto } from '../../../../primary-adapters/dto/update-product.dto';
import { IProduct } from '../../../domain/interfaces/product.interface';

@Injectable()
export class UpdateProductUseCase extends UseCase<
  { id: number; dto: UpdateProductDto },
  IProduct,
  UseCaseError
> {
  constructor(private readonly productRepository: ProductRepository) {
    super();
  }

  async execute(input: {
    id: number;
    dto: UpdateProductDto;
  }): Promise<Result<IProduct, UseCaseError>> {
    try {
      const { id, dto } = input;
      const productResult = await this.productRepository.update(id, dto);

      if (isFailure(productResult)) {
        return ErrorFactory.UseCaseError(productResult.error.message);
      }

      return Result.success<IProduct>(productResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
