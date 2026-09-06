import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Category } from '../entities/category';

export abstract class CategoryRepository {
  abstract findById(
    id: number,
  ): Promise<Result<Category | null, RepositoryError>>;
  abstract findBySlug(
    slug: string,
  ): Promise<Result<Category | null, RepositoryError>>;
  abstract findAll(filter?: {
    isActive?: boolean;
  }): Promise<Result<Category[], RepositoryError>>;
  abstract save(category: Category): Promise<Result<Category, RepositoryError>>;
  abstract deleteById(id: number): Promise<Result<void, RepositoryError>>;
  abstract existsByName(
    name: string,
    excludeId?: number,
  ): Promise<Result<boolean, RepositoryError>>;
  abstract existsBySlug(
    slug: string,
    excludeId?: number,
  ): Promise<Result<boolean, RepositoryError>>;
}
