import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import {
  CategoryResult,
  toCategoryResult,
} from '../../queries/results/category.result';

@Injectable()
export class GetCategoryUseCase extends UseCase<
  number,
  CategoryResult,
  AppError
> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super();
  }

  async execute(id: number): Promise<Result<CategoryResult, AppError>> {
    const result = await this.categoryRepository.findById(id);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError('Failed to find category', result.error);
    }

    if (!result.value) {
      return ErrorFactory.QueryNotFoundError(
        `Category with id ${id} not found`,
      );
    }

    return Result.success(toCategoryResult(result.value));
  }
}
