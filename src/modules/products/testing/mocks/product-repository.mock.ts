// src/modules/products/testing/mocks/product-repository.mock.ts
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Product } from '../../core/domain/entities/product';
import { ProductRepository } from '../../core/domain/repositories/product-repository';

export class MockProductRepository implements ProductRepository {
  findByIdForUpdate = jest.fn<
    Promise<
      Result<{ entity: Product; expectedVersion: number }, RepositoryError>
    >,
    [number]
  >();
  save = jest.fn<
    Promise<Result<Product, RepositoryError>>,
    [Product, number?]
  >();
  findById = jest.fn<Promise<Result<Product, RepositoryError>>, [number]>();
  findAll = jest.fn<Promise<Result<Product[], RepositoryError>>, []>();
  deleteById = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  // Helper methods for common test scenarios
  mockSuccessfulFind(product: Product): void {
    this.findById.mockResolvedValue(Result.success(product));
  }

  mockSuccessfulFindByIdForUpdate(
    product: Product,
    expectedVersion: number = 1,
  ): void {
    this.findByIdForUpdate.mockResolvedValue(
      Result.success({ entity: product, expectedVersion }),
    );
  }

  mockFindByIdForUpdateFailure(errorMessage: string): void {
    this.findByIdForUpdate.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockProductNotFound(productId: number): void {
    this.findById.mockResolvedValue(
      Result.failure(
        new RepositoryError(`Product with id ${productId} not found`),
      ),
    );
    this.findByIdForUpdate.mockResolvedValue(
      Result.failure(
        new RepositoryError(`Product with id ${productId} not found`),
      ),
    );
  }

  mockSuccessfulSave(product?: Product): void {
    if (product) {
      this.save.mockResolvedValue(Result.success(product));
    } else {
      this.save.mockImplementation(async (p: Product) => Result.success(p));
    }
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulList(products: Product[]): void {
    this.findAll.mockResolvedValue(Result.success(products));
  }

  mockListFailure(errorMessage: string): void {
    this.findAll.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulDelete(): void {
    this.deleteById.mockResolvedValue(Result.success(undefined));
  }

  mockDeleteFailure(errorMessage: string): void {
    this.deleteById.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  // Reset all mocks
  reset(): void {
    jest.clearAllMocks();
  }

  // Verify no unexpected calls were made
  verifyNoUnexpectedCalls(): void {
    expect(this.save).not.toHaveBeenCalled();
    expect(this.findByIdForUpdate).not.toHaveBeenCalled();
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findAll).not.toHaveBeenCalled();
    expect(this.deleteById).not.toHaveBeenCalled();
  }
}
