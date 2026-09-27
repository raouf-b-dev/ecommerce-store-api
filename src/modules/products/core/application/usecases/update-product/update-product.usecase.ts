import { HttpStatus, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UpdateProductCommand } from '../../commands/update-product.command';
import { IProduct } from '../../../domain/interfaces/product.interface';

@Injectable()
export class UpdateProductUseCase extends UseCase<
  UpdateProductCommand,
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
    command: UpdateProductCommand,
  ): Promise<Result<IProduct, UseCaseError>> {
    try {
      if (command.categoryId === null) {
        return ErrorFactory.UseCaseError(
          'categoryId cannot be null',
          undefined,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (command.categoryId != null) {
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
      }

      const findResult = await this.productRepository.findByIdForUpdate(
        command.id,
      );

      if (isFailure(findResult)) {
        return ErrorFactory.UseCaseError(findResult.error.message);
      }

      const { entity, expectedVersion } = findResult.value;

      entity.updateProduct({
        name: command.name,
        description: command.description,
        price: command.price,
        currency: command.currency,
        sku: command.sku,
        imageUrl: command.imageUrl,
        categoryId: command.categoryId,
      });

      const saveResult = await this.productRepository.save(
        entity,
        expectedVersion,
      );

      if (isFailure(saveResult)) {
        return ErrorFactory.UseCaseError(saveResult.error.message);
      }

      return Result.success<IProduct>(entity.toPrimitives());
    } catch (error) {
      if (error instanceof Error) {
        return ErrorFactory.UseCaseError(error.message);
      }
      return ErrorFactory.UseCaseError('Failed to update product');
    }
  }
}
