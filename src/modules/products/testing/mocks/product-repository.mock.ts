// src/modules/products/testing/mocks/product-repository.mock.ts
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { IProduct } from '../../domain/interfaces/product.interface';
import { ProductRepository } from '../../domain/repositories/product-repository';
import { CreateProductDto } from '../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../presentation/dto/update-product.dto';

export class MockProductRepository implements ProductRepository {
  // Jest mock functions matching the actual repository interface
  save = jest.fn<
    Promise<Result<IProduct, RepositoryError>>,
    [CreateProductDto]
  >();
  update = jest.fn<
    Promise<Result<IProduct, RepositoryError>>,
    [string, UpdateProductDto]
  >();
  findById = jest.fn<Promise<Result<IProduct, RepositoryError>>, [string]>();
  findAll = jest.fn<Promise<Result<IProduct[], RepositoryError>>, []>();
  deleteById = jest.fn<Promise<Result<void, RepositoryError>>, [string]>();

  // Helper methods for common test scenarios
  mockSuccessfulFind(product: IProduct): void {
    this.findById.mockResolvedValue(Result.success(product));
  }

  mockProductNotFound(productId: string): void {
    this.findById.mockResolvedValue(
      Result.failure(
        new RepositoryError(`Product with id ${productId} not found`),
      ),
    );
  }

  mockSuccessfulSave(product: IProduct): void {
    this.save.mockResolvedValue(Result.success(product));
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulUpdate(product: IProduct): void {
    this.update.mockResolvedValue(Result.success(product));
  }

  mockUpdateFailure(errorMessage: string): void {
    this.update.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulList(products: IProduct[]): void {
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
    expect(this.update).not.toHaveBeenCalled();
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findAll).not.toHaveBeenCalled();
    expect(this.deleteById).not.toHaveBeenCalled();
  }
}
