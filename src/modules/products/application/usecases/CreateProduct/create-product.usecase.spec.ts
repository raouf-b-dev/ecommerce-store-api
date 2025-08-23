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
import { CreateProductUseCase } from './create-product.usecase';
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let product: Product;
  let createProductDto: CreateProductDto;

  beforeEach(() => {
    mockProductRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    };

    useCase = new CreateProductUseCase(mockProductRepository);

    product = new Product({
      id: 'PR0000001',
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    });

    createProductDto = {
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
    } as CreateProductDto;
  });

  describe('execute', () => {
    it('should return Success if product is created', async () => {
      mockProductRepository.save.mockResolvedValue(Result.success(product));

      const result = await useCase.execute(createProductDto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(product);
      }
      expect(mockProductRepository.save).toHaveBeenCalledWith(createProductDto);
      expect(mockProductRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not created', async () => {
      const repoError = ErrorFactory.RepositoryError(`Failed to save product`);
      mockProductRepository.save.mockResolvedValue(repoError);

      const result = await useCase.execute(createProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(`Failed to save product`);
      }
      expect(mockProductRepository.save).toHaveBeenCalledWith(createProductDto);
      expect(mockProductRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const repoError = new Error('Database connection failed');

      mockProductRepository.save.mockRejectedValue(repoError);

      const result = await useCase.execute(createProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(repoError);
      }
      expect(mockProductRepository.save).toHaveBeenCalledWith(createProductDto);
      expect(mockProductRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
