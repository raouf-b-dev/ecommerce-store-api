import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { ListCategoriesQuery } from '../../queries/list-categories.query';
import {
  CategoryResult,
  toCategoryResult,
} from '../../queries/results/category.result';

@Injectable()
export class ListCategoriesUseCase extends UseCase<
  ListCategoriesQuery | undefined,
  CategoryResult[],
  UseCaseError
> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super();
  }

  async execute(
    query: ListCategoriesQuery = {},
  ): Promise<Result<CategoryResult[], UseCaseError>> {
    const result = await this.categoryRepository.findAll({
      isActive: query.isActive,
    });

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to load categories',
        result.error,
      );
    }

    return Result.success(result.value.map(toCategoryResult));
  }
}
