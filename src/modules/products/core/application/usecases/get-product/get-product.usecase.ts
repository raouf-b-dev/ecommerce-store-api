import { HttpStatus, Injectable } from '@nestjs/common';
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

    if (isFailure(result) || !result.value) {
      return ErrorFactory.UseCaseError(
        `Product with id ${id} not found`,
        isFailure(result) ? result.error : null,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!CatalogVisibilityPolicy.isVisible(result.value.isActive, caller)) {
      return ErrorFactory.UseCaseError(
        `Product with id ${id} not found`,
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    return Result.success(result.value);
  }
}
