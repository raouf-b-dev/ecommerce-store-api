import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Category } from '../../core/domain/entities/category';
import { CategoryRepository } from '../../core/domain/repositories/category-repository';
import { CategoryTestFactory } from '../factories/category.factory';

export class MockCategoryRepository implements CategoryRepository {
  findById = jest.fn<
    Promise<Result<Category | null, RepositoryError>>,
    [number]
  >();
  findBySlug = jest.fn<
    Promise<Result<Category | null, RepositoryError>>,
    [string]
  >();
  findAll = jest.fn<
    Promise<Result<Category[], RepositoryError>>,
    [{ isActive?: boolean }?]
  >();
  save = jest.fn<Promise<Result<Category, RepositoryError>>, [Category]>();
  deleteById = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();
  existsByName = jest.fn<
    Promise<Result<boolean, RepositoryError>>,
    [string, number?]
  >();
  existsBySlug = jest.fn<
    Promise<Result<boolean, RepositoryError>>,
    [string, number?]
  >();

  mockSuccessfulFindById(category?: Category): void {
    this.findById.mockResolvedValue(
      Result.success(category ?? CategoryTestFactory.createDomainCategory()),
    );
  }

  mockMissingCategory(): void {
    this.findById.mockResolvedValue(Result.success(null));
  }

  mockFindByIdFailure(errorMessage: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulFindAll(categories: Category[]): void {
    this.findAll.mockResolvedValue(Result.success(categories));
  }

  mockSuccessfulSave(category?: Category): void {
    this.save.mockImplementation((incoming) => {
      if (incoming.id == null) {
        incoming.setId(category?.id ?? 10);
      }
      return Promise.resolve(Result.success(incoming));
    });
  }

  mockSuccessfulDelete(): void {
    this.deleteById.mockResolvedValue(Result.success(undefined));
  }

  mockNameExists(exists = false): void {
    this.existsByName.mockResolvedValue(Result.success(exists));
  }

  mockSlugExists(exists = false): void {
    this.existsBySlug.mockResolvedValue(Result.success(exists));
  }

  reset(): void {
    jest.clearAllMocks();
  }
}
