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
import { CategoryQueryService } from '../../ports/category-query.service';
import { ListCategoriesQuery } from '../../queries/list-categories.query';
import { CategoryResult } from '../../queries/results/category.result';

@Injectable()
export class ListCategoriesUseCase extends UseCase<
  ListCategoriesQuery | undefined,
  CategoryResult[],
  UseCaseError
> {
  constructor(private readonly categoryQueryService: CategoryQueryService) {
    super();
  }

  async execute(
    query: ListCategoriesQuery = {},
    caller: CallerContext | null = null,
  ): Promise<Result<CategoryResult[], UseCaseError>> {
    const scopedQuery = CatalogVisibilityPolicy.constrainListFilter(
      query,
      caller,
    );
    const result = await this.categoryQueryService.list({
      isActive: scopedQuery.isActive,
    });

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to load categories',
        result.error,
      );
    }

    return Result.success(result.value);
  }
}
