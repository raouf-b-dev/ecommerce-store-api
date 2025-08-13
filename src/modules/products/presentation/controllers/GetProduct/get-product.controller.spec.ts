// src/modules/Products/presentation/controllers/get-Product.controller.spec.ts
import { GetProductController } from './get-product.controller';
import { Product } from '../../../domain/entities/product';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { GetProductUseCase } from '../../../application/usecases/GetProduct/get-product.usecase';

describe('GetProductController', () => {
  let controller: GetProductController;
  let mockGetProductUseCase: jest.Mocked<GetProductUseCase>;

  beforeEach(() => {
    // Mock the GetProductUseCase
    mockGetProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetProductUseCase>;

    controller = new GetProductController(mockGetProductUseCase);
  });

  describe('handle', () => {
    it('should return success if Product if found', async () => {
      const productId = 1;
      const expectedProduct = new Product({
        id: productId,
        name: 'Car',
        description: 'A fast red sports car',
        price: 35000,
        sku: 'CAR-001',
        stockQuantity: 10,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-08-13T15:00:00Z'),
      });

      mockGetProductUseCase.execute.mockResolvedValue(
        Result.success(expectedProduct),
      );

      const result = await controller.handle(productId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(expectedProduct);
      }
      expect(mockGetProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockGetProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if product is not found', async () => {
      const productId = 999;

      mockGetProductUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(`Product with id ${productId} not found`)
            .error,
        ),
      );

      const result = await controller.handle(productId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Controller failed to get product');
        expect(result.error.cause?.message).toBe(
          `Product with id ${productId} not found`,
        );
      }

      expect(mockGetProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockGetProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const productId = 999;
      const error = new Error('Database connection failed');

      mockGetProductUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(productId);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

      expect(mockGetProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockGetProductUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
