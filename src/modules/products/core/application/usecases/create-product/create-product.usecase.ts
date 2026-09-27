import { HttpStatus, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { Product } from '../../../domain/entities/product';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CreateProductCommand } from '../../commands/create-product.command';
import { IProduct } from '../../../domain/interfaces/product.interface';

@Injectable()
export class CreateProductUseCase extends UseCase<
  CreateProductCommand,
  IProduct,
  UseCaseError
> {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {
    super();
  }

  async execute(
    command: CreateProductCommand,
  ): Promise<Result<IProduct, UseCaseError>> {
    try {
      if (command.categoryId == null) {
        return ErrorFactory.UseCaseError(
          'categoryId is required',
          undefined,
          HttpStatus.BAD_REQUEST,
        );
      }

      const categoryResult = await this.categoryRepository.findById(
        command.categoryId,
      );
      if (isFailure(categoryResult)) {
        return ErrorFactory.UseCaseError(categoryResult.error.message);
      }
      if (!categoryResult.value || !categoryResult.value.isActive) {
        return ErrorFactory.UseCaseError(
          `Category with id ${command.categoryId} not found`,
          undefined,
          HttpStatus.BAD_REQUEST,
        );
      }

      const product = Product.create({
        id: null,
        name: command.name,
        description: command.description,
        price: command.price,
        currency: command.currency,
        sku: command.sku,
        imageUrl: command.imageUrl,
        categoryId: command.categoryId,
      });

      const saveResult = await this.productRepository.save(product);

      if (isFailure(saveResult)) {
        return ErrorFactory.UseCaseError(saveResult.error.message);
      }

      return Result.success<IProduct>(product.toPrimitives());
    } catch (error) {
      if (error instanceof Error) {
        return ErrorFactory.UseCaseError(error.message);
      }
      return ErrorFactory.UseCaseError('Failed to create product');
    }
  }
}
