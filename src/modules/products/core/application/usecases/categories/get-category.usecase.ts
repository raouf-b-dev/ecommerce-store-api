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
      return ErrorFactory.UseCaseError('Failed to find category', result.error);
    }

    if (!result.value) {
      return ErrorFactory.QueryNotFoundError(
        `Category with id ${id} not found`,
      );
    }

    const category = result.value;
    if (!CatalogVisibilityPolicy.isVisible(category.isActive, caller)) {
      return ErrorFactory.QueryNotFoundError(
        `Category with id ${id} not found`,
      );
    }

    return Result.success(category);
  }
}
