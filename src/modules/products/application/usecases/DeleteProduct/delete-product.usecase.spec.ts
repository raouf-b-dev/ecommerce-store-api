// src/modules/Products/application/usecases/DeleteProduct/delete-Product.usecase.spec.ts
import { ProductRepository } from '../../../domain/repositories/product-repository';
import {
  Result,
  isFailure,
  isSuccess,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { DeleteProductUseCase } from './delete-product.usecase';

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let productId: string;

  beforeEach(() => {
    mockProductRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    };
    productId = 'PR0000001';

    useCase = new DeleteProductUseCase(mockProductRepository);
  });

  describe('execute', () => {
    it('should return Success if product is deleted', async () => {
      mockProductRepository.deleteById.mockResolvedValue(
        Result.success(undefined),
      );

      const result = await useCase.execute(productId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(undefined);
      }
      expect(mockProductRepository.deleteById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.deleteById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not deleted', async () => {
      mockProductRepository.deleteById.mockResolvedValue(
        ErrorFactory.RepositoryError(
          `Product with id ${productId} not deleted`,
        ),
      );

      const result = await useCase.execute(productId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(
          `Product with id ${productId} not deleted`,
        );
      }
      expect(mockProductRepository.deleteById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.deleteById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const repoError = new Error('Database connection failed');

      mockProductRepository.deleteById.mockRejectedValue(repoError);

      const result = await useCase.execute(productId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(repoError);
      }
      expect(mockProductRepository.deleteById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.deleteById).toHaveBeenCalledTimes(1);
    });
  });
});
