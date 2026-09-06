import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ProductRepository } from '../../../domain/repositories/product-repository';

@Injectable()
export class DeactivateProductUseCase extends UseCase<
  number,
  void,
  UseCaseError
> {
  private readonly logger = new Logger(DeactivateProductUseCase.name);

  constructor(private readonly productRepository: ProductRepository) {
    super();
  }

  async execute(productId: number): Promise<Result<void, UseCaseError>> {
    const productResult =
      await this.productRepository.findByIdForUpdate(productId);

    if (isFailure(productResult)) {
      return ErrorFactory.UseCaseError(
        productResult.error.message,
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    const { entity: product, expectedVersion } = productResult.value;

    const deactivateResult = product.deactivate();
    if (deactivateResult.isFailure) {
      return deactivateResult;
    }

    const saveResult = await this.productRepository.save(
      product,
      expectedVersion,
    );
    if (isFailure(saveResult)) {
      return saveResult;
    }

    this.logger.log(`Product ${productId} deactivated.`);

    return Result.success(undefined);
  }
}
