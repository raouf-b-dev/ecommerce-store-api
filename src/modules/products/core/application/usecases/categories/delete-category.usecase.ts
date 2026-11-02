import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { categoryNotFoundError } from '../../services/category-not-found';
import { CategoryRepository } from '../../../domain/repositories/category-repository';

@Injectable()
export class DeleteCategoryUseCase extends UseCase<number, void, AppError> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super();
  }

  async execute(id: number): Promise<Result<void, AppError>> {
    const findResult = await this.categoryRepository.findById(id);
    if (isFailure(findResult)) {
      if (findResult.error.kind === ErrorKind.NOT_FOUND) {
        return categoryNotFoundError(id);
      }
      return ErrorFactory.UseCaseError(findResult.error.message, {
        cause: findResult.error,
        kind: findResult.error.kind,
        retryable: findResult.error.retryable,
      });
    }
    if (!findResult.value) {
      return categoryNotFoundError(id);
    }

    const deleteResult = await this.categoryRepository.deleteById(id);
    if (isFailure(deleteResult)) {
      return ErrorFactory.UseCaseError('Failed to delete category', {
        cause: deleteResult.error,
      });
    }

    return Result.success(undefined);
  }
}
