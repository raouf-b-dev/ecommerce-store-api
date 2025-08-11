// src/modules/Products/application/usecases/GetProduct/get-Product.usecase.spec.ts
import { Product } from '../../../domain/entities/product';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import {
  Result,
  isFailure,
  isSuccess,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { GetProductUseCase } from './get-product.usecase';

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    mockProductRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    };

    useCase = new GetProductUseCase(mockProductRepository);
  });

  describe('execute', () => {
    it('should return Success if product is found', async () => {
      const productId = 1;
      const expectedProduct = new Product({ id: productId, name: 'Car' });

      mockProductRepository.findById.mockResolvedValue(
        Result.success(expectedProduct),
      );

      const result = await useCase.execute(productId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(expectedProduct);
      }
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not found', async () => {
      const productId = 999;
      mockProductRepository.findById.mockResolvedValue(
        ErrorFactory.RepositoryError(`Product with id ${productId} not found`),
      );

      const result = await useCase.execute(productId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(
          `Product with id ${productId} not found`,
        );
      }
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const productId = 2;
      const repoError = new Error('Database connection failed');

      mockProductRepository.findById.mockRejectedValue(repoError);

      const result = await useCase.execute(productId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(repoError);
      }
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.findById).toHaveBeenCalledTimes(1);
    });
  });
});
