import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CategoryRepository } from '../../../domain/repositories/category-repository';

@Injectable()
export class ActivateCategoryUseCase extends UseCase<number, void, AppError> {
  private readonly logger = new Logger(ActivateCategoryUseCase.name);

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

    const category = findResult.value;
    const activateResult = category.activate();
    if (activateResult.isFailure) {
      return activateResult;
    }

    const saveResult = await this.categoryRepository.save(category);
    if (isFailure(saveResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to activate category',
        saveResult.error,
      );
    }

    this.logger.log(`Category ${id} activated.`);
    return Result.success(undefined);
  }
}
