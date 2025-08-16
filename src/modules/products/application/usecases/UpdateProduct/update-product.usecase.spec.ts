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
import { UpdateProductUseCase } from './update-product.usecase';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let product: Product;
  let updateProductDto: UpdateProductDto;
  let id_param: number;

  beforeEach(() => {
    mockProductRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    };

    useCase = new UpdateProductUseCase(mockProductRepository);

    id_param = 1;
    updateProductDto = {
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
    } as UpdateProductDto;

    product = new Product({
      id: id_param,
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    });
  });

  describe('execute', () => {
    it('should return Success if product is updated', async () => {
      mockProductRepository.update.mockResolvedValue(Result.success(product));

      const result = await useCase.execute({
        id: id_param,
        dto: updateProductDto,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(product);
      }
      expect(mockProductRepository.update).toHaveBeenCalledWith(
        id_param,
        updateProductDto,
      );
      expect(mockProductRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not updated', async () => {
      const repoError = ErrorFactory.RepositoryError(
        `Failed to update product`,
      );
      mockProductRepository.update.mockResolvedValue(repoError);

      const result = await useCase.execute({
        id: id_param,
        dto: updateProductDto,
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe(`Failed to update product`);
      }
      expect(mockProductRepository.update).toHaveBeenCalledWith(
        id_param,
        updateProductDto,
      );
      expect(mockProductRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const repoError = new Error('Database connection failed');

      mockProductRepository.update.mockRejectedValue(repoError);

      const result = await useCase.execute({
        id: id_param,
        dto: updateProductDto,
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(UseCaseError);
        expect(result.error.message).toBe('Unexpected use case error');
        expect(result.error.cause).toBe(repoError);
      }
      expect(mockProductRepository.update).toHaveBeenCalledWith(
        id_param,
        updateProductDto,
      );
      expect(mockProductRepository.update).toHaveBeenCalledTimes(1);
    });
  });
});
