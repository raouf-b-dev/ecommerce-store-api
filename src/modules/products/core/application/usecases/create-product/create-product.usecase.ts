import { HttpStatus, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { CurrencyConfigPort } from '../../ports/currency-config.port';
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
    private readonly currencyConfig: CurrencyConfigPort,
  ) {
    super();
  }

  async execute(
    command: CreateProductCommand,
  ): Promise<Result<IProduct, UseCaseError>> {
    try {
      const normalizedCurrency = command.currency?.trim().toUpperCase();
      const supportedCurrencies = this.currencyConfig.getSupportedCurrencies();
      if (
        !normalizedCurrency ||
        !supportedCurrencies.includes(normalizedCurrency)
      ) {
        return ErrorFactory.UseCaseError(
          `Currency "${command.currency}" is not supported by this store`,
          { status: HttpStatus.BAD_REQUEST },
        );
      }
      if (command.categoryId == null) {
        return ErrorFactory.UseCaseError('categoryId is required', {
          status: HttpStatus.BAD_REQUEST,
        });
      }

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

      const product = Product.create({
        id: null,
        name: command.name,
        description: command.description,
        price: command.price,
        currency: normalizedCurrency,
        sku: command.sku,
        imageUrl: command.imageUrl,
        categoryId: command.categoryId,
      });

      const saveResult = await this.productRepository.save(product);

      if (isFailure(saveResult)) {
        return saveResult;
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
