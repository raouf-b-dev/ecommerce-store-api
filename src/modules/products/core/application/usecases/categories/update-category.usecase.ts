import { HttpStatus, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { UpdateCategoryCommand } from '../../commands/update-category.command';
import {
  CategoryResult,
  toCategoryResult,
} from '../../queries/results/category.result';

@Injectable()
export class UpdateCategoryUseCase extends UseCase<
  UpdateCategoryCommand,
  CategoryResult,
  AppError
> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super();
  }

  async execute(
    command: UpdateCategoryCommand,
  ): Promise<Result<CategoryResult, AppError>> {
    const findResult = await this.categoryRepository.findById(command.id);
    if (isFailure(findResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to find category',
        findResult.error,
      );
    }
    if (!findResult.value) {
      return ErrorFactory.QueryNotFoundError(
        `Category with id ${command.id} not found`,
      );
    }

    const category = findResult.value;
    const detailsResult = category.updateDetails({
      name: command.name,
      slug: command.slug,
      description: command.description,
    });
    if (detailsResult.isFailure) {
      return detailsResult;
    }

    const nameExists = await this.categoryRepository.existsByName(
      category.name,
      command.id,
    );
    if (isFailure(nameExists)) {
      return ErrorFactory.UseCaseError(
        'Failed to validate category name uniqueness',
        nameExists.error,
      );
    }
    if (nameExists.value) {
      return ErrorFactory.UseCaseError(
        `Category with name ${category.name} already exists`,
        undefined,
        HttpStatus.CONFLICT,
      );
    }

    const slugExists = await this.categoryRepository.existsBySlug(
      category.slug,
      command.id,
    );
    if (isFailure(slugExists)) {
      return ErrorFactory.UseCaseError(
        'Failed to validate category slug uniqueness',
        slugExists.error,
      );
    }
    if (slugExists.value) {
      return ErrorFactory.UseCaseError(
        `Category with slug ${category.slug} already exists`,
        undefined,
        HttpStatus.CONFLICT,
      );
    }

    const saveResult = await this.categoryRepository.save(category);
    if (isFailure(saveResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to update category',
        saveResult.error,
      );
    }

    return Result.success(toCategoryResult(saveResult.value));
  }
}
