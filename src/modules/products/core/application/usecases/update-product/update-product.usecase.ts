import { HttpStatus, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { CurrencyConfigPort } from '../../ports/currency-config.port';
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
    private readonly currencyConfig: CurrencyConfigPort,
  ) {
    super();
  }

  async execute(
    command: UpdateProductCommand,
  ): Promise<Result<IProduct, UseCaseError>> {
    try {
      if (command.categoryId === null) {
        return ErrorFactory.UseCaseError('categoryId cannot be null', {
          status: HttpStatus.BAD_REQUEST,
        });
      }

      if (command.categoryId != null) {
        const categoryResult = await this.categoryRepository.findById(
          command.categoryId,
        );
        if (isFailure(categoryResult)) {
          return categoryResult;
        }
        if (!categoryResult.value || !categoryResult.value.isActive) {
          return ErrorFactory.UseCaseError(
            `Category with id ${command.categoryId} not found`,
            { status: HttpStatus.BAD_REQUEST },
          );
        }
      }

      const findResult = await this.productRepository.findByIdForUpdate(
        command.id,
      );

      if (isFailure(findResult)) {
        return findResult;
      }

      const { entity, expectedVersion } = findResult.value;

      const effectiveCurrency = (command.currency ?? entity.currency)
        ?.trim()
        .toUpperCase();

      const supportedCurrencies = this.currencyConfig.getSupportedCurrencies();
      if (
        !effectiveCurrency ||
        !supportedCurrencies.includes(effectiveCurrency)
      ) {
        return ErrorFactory.UseCaseError(
          `Effective product currency "${effectiveCurrency}" is not supported by this store`,
          { status: HttpStatus.BAD_REQUEST },
        );
      }

      const updatedCurrency =
        command.currency !== undefined ? effectiveCurrency : undefined;

      entity.updateProduct({
        name: command.name,
        description: command.description,
        price: command.price,
        currency: updatedCurrency,
        sku: command.sku,
        imageUrl: command.imageUrl,
        categoryId: command.categoryId,
      });

      const saveResult = await this.productRepository.save(
        entity,
        expectedVersion,
      );

      if (isFailure(saveResult)) {
        return saveResult;
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
