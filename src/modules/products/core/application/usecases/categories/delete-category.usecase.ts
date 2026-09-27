import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CategoryRepository } from '../../../domain/repositories/category-repository';

@Injectable()
export class DeleteCategoryUseCase extends UseCase<number, void, AppError> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super();
  }

  async execute(id: number): Promise<Result<void, AppError>> {
    const findResult = await this.categoryRepository.findById(id);
    if (isFailure(findResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to find category',
        findResult.error,
      );
    }
    if (!findResult.value) {
      return ErrorFactory.QueryNotFoundError(
        `Category with id ${id} not found`,
      );
    }

    const deleteResult = await this.categoryRepository.deleteById(id);
    if (isFailure(deleteResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to delete category',
        deleteResult.error,
      );
    }

    return Result.success(undefined);
  }
}
