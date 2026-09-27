import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { CategoryRepository } from '../../../core/domain/repositories/category-repository';
import { Category } from '../../../core/domain/entities/category';
import { CategoryEntity } from '../../orm/category.schema';
import { CategoryMapper } from '../../persistence/mappers/category.mapper';

export class PostgresCategoryRepository implements CategoryRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly ormRepo: Repository<CategoryEntity>,
  ) {}

  async findById(
    id: number,
  ): Promise<Result<Category | null, RepositoryError>> {
    try {
      const ormEntity = await this.ormRepo.findOne({ where: { id } });
      if (!ormEntity) {
        return Result.success(null);
      }
      return Result.success(CategoryMapper.toDomain(ormEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find the category', error);
    }
  }

  async findBySlug(
    slug: string,
  ): Promise<Result<Category | null, RepositoryError>> {
    try {
      const ormEntity = await this.ormRepo.findOne({ where: { slug } });
      if (!ormEntity) {
        return Result.success(null);
      }
      return Result.success(CategoryMapper.toDomain(ormEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find the category by slug',
        error,
      );
    }
  }

  async findAll(filter?: {
    isActive?: boolean;
  }): Promise<Result<Category[], RepositoryError>> {
    try {
      const where =
        filter?.isActive === undefined ? {} : { isActive: filter.isActive };
      const ormEntities = await this.ormRepo.find({
        where,
        order: { id: 'ASC' },
      });
      return Result.success(CategoryMapper.toDomainArray(ormEntities));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find categories', error);
    }
  }

  async save(category: Category): Promise<Result<Category, RepositoryError>> {
    try {
      const saved = await this.ormRepo.save(CategoryMapper.toEntity(category));
      if (category.id == null) {
        category.setId(saved.id);
      }
      return Result.success(category);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save the category', error);
    }
  }

  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    try {
      await this.ormRepo.delete(id);
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to delete the category',
        error,
      );
    }
  }

  async existsByName(
    name: string,
    excludeId?: number,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const found = await this.ormRepo.findOne({
        where: excludeId != null ? { name, id: Not(excludeId) } : { name },
      });
      return Result.success(found != null);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to check category name uniqueness',
        error,
      );
    }
  }

  async existsBySlug(
    slug: string,
    excludeId?: number,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const found = await this.ormRepo.findOne({
        where: excludeId != null ? { slug, id: Not(excludeId) } : { slug },
      });
      return Result.success(found != null);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to check category slug uniqueness',
        error,
      );
    }
  }
}
