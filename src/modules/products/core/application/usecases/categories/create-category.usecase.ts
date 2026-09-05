import { HttpStatus, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { Category } from '../../../domain/entities/category';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { CreateCategoryCommand } from '../../commands/create-category.command';
import {
  CategoryResult,
  toCategoryResult,
} from '../../queries/results/category.result';

@Injectable()
export class CreateCategoryUseCase extends UseCase<
  CreateCategoryCommand,
  CategoryResult,
  UseCaseError
> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super();
  }

  async execute(
    command: CreateCategoryCommand,
  ): Promise<Result<CategoryResult, UseCaseError>> {
    try {
      const category = Category.create({
        name: command.name,
        slug: command.slug,
        description: command.description,
      });

      const nameExists = await this.categoryRepository.existsByName(
        category.name,
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
          'Failed to create category',
          saveResult.error,
        );
      }

      return Result.success(toCategoryResult(saveResult.value));
    } catch (error) {
      if (error instanceof Error) {
        return ErrorFactory.UseCaseError(error.message);
      }
      return ErrorFactory.UseCaseError('Failed to create category');
    }
  }
}
