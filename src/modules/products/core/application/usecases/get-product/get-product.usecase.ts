import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CatalogVisibilityPolicy } from '../../../domain/policies/catalog-visibility.policy';
import { ProductQueryService } from '../../ports/product-query.service';
import { ProductDetailDTO } from '../../queries/results/product-detail.result';
import { productNotFoundError } from '../../services/product-not-found';

@Injectable()
export class GetProductUseCase extends UseCase<
  number,
  ProductDetailDTO,
  UseCaseError
> {
  constructor(private readonly productQueryService: ProductQueryService) {
    super();
  }

  async execute(
    id: number,
    caller: CallerContext | null = null,
  ): Promise<Result<ProductDetailDTO, UseCaseError>> {
    const result = await this.productQueryService.getById(id);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(result.error.message, {
        cause: result.error,
        kind: result.error.kind,
        retryable: result.error.retryable,
      });
    }

    if (!result.value) {
      return productNotFoundError(id);
    }

    if (!CatalogVisibilityPolicy.isVisible(result.value.isActive, caller)) {
      return productNotFoundError(id);
    }

    return Result.success(result.value);
  }
}
