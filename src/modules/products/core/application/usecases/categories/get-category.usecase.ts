import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CatalogVisibilityPolicy } from '../../../domain/policies/catalog-visibility.policy';
import { CategoryQueryService } from '../../ports/category-query.service';
import { CategoryResult } from '../../queries/results/category.result';
import { categoryNotFoundError } from '../../services/category-not-found';

@Injectable()
export class GetCategoryUseCase extends UseCase<
  number,
  CategoryResult,
  AppError
> {
  constructor(private readonly categoryQueryService: CategoryQueryService) {
    super();
  }

  async execute(
    id: number,
    caller: CallerContext | null = null,
  ): Promise<Result<CategoryResult, AppError>> {
    const result = await this.categoryQueryService.getById(id);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(result.error.message, {
        cause: result.error,
        kind: result.error.kind,
        retryable: result.error.retryable,
      });
    }

    if (!result.value) {
      return categoryNotFoundError(id);
    }

    if (!CatalogVisibilityPolicy.isVisible(result.value.isActive, caller)) {
      return categoryNotFoundError(id);
    }

    return Result.success(result.value);
  }
}
