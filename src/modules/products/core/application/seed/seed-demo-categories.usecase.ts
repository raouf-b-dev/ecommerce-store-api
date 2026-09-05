import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Category } from '../../domain/entities/category';
import { CategoryRepository } from '../../domain/repositories/category-repository';
import { DEMO_SEED_CATEGORIES } from './demo-categories';

export interface SeededDemoCategory {
  id: number;
  slug: string;
  name: string;
  status: 'created' | 'existing' | 'reactivated';
}

@Injectable()
export class SeedDemoCategoriesUseCase extends UseCase<
  void,
  SeededDemoCategory[],
  UseCaseError
> {
  constructor(private readonly categoryRepository: CategoryRepository) {
    super();
  }

  async execute(): Promise<Result<SeededDemoCategory[], UseCaseError>> {
    const seeded: SeededDemoCategory[] = [];

    for (const fixture of DEMO_SEED_CATEGORIES) {
      const findResult = await this.categoryRepository.findBySlug(fixture.slug);
      if (isFailure(findResult)) {
        return ErrorFactory.UseCaseError(
          `Failed to lookup category ${fixture.slug}`,
          findResult.error,
        );
      }

      const existing = findResult.value;

      if (!existing) {
        const category = Category.create({
          name: fixture.name,
          slug: fixture.slug,
          description: fixture.description,
        });
        const saveResult = await this.categoryRepository.save(category);
        if (isFailure(saveResult)) {
          return ErrorFactory.UseCaseError(
            `Failed to seed category ${fixture.slug}`,
            saveResult.error,
          );
        }
        const id = saveResult.value.id;
        if (id == null) {
          return ErrorFactory.UseCaseError(
            `Failed to seed category ${fixture.slug}: missing id after save`,
          );
        }
        seeded.push({
          id,
          slug: fixture.slug,
          name: fixture.name,
          status: 'created',
        });
        continue;
      }

      if (!existing.isActive) {
        const activateResult = existing.activate();
        if (isFailure(activateResult)) {
          return ErrorFactory.UseCaseError(
            `Failed to reactivate category ${fixture.slug}`,
            activateResult.error,
          );
        }
        const saveResult = await this.categoryRepository.save(existing);
        if (isFailure(saveResult)) {
          return ErrorFactory.UseCaseError(
            `Failed to save reactivated category ${fixture.slug}`,
            saveResult.error,
          );
        }
        const id = existing.id;
        if (id == null) {
          return ErrorFactory.UseCaseError(
            `Failed to reactivate category ${fixture.slug}: missing id`,
          );
        }
        seeded.push({
          id,
          slug: fixture.slug,
          name: existing.name,
          status: 'reactivated',
        });
        continue;
      }

      const id = existing.id;
      if (id == null) {
        return ErrorFactory.UseCaseError(
          `Category ${fixture.slug} is missing id`,
        );
      }
      seeded.push({
        id,
        slug: fixture.slug,
        name: existing.name,
        status: 'existing',
      });
    }

    return Result.success(seeded);
  }
}
