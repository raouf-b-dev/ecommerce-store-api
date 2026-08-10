import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaginatedQueryResult } from '../../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { ProductQueryService } from '../../ports/product-query.service';
import { ListProductsQuery } from '../../queries/list-products.query';
import { ProductListItemDTO } from '../../queries/results/product-list-item.result';

@Injectable()
export class ListProductsUseCase implements UseCase<
  ListProductsQuery | undefined,
  PaginatedQueryResult<ProductListItemDTO>,
  UseCaseError
> {
  constructor(private readonly productQueryService: ProductQueryService) {}

  async execute(
    query: ListProductsQuery = {},
  ): Promise<Result<PaginatedQueryResult<ProductListItemDTO>, UseCaseError>> {
    const result = await this.productQueryService.list(query);
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(result.error.message, result.error);
    }
    return Result.success(result.value);
  }
}
