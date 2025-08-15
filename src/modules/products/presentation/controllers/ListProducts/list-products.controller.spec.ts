// src/modules/Products/presentation/controllers/get-Product.controller.spec.ts
import { ListProductsController } from './list-products.controller';
import { Product } from '../../../domain/entities/product';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ListProductsUseCase } from '../../../application/usecases/ListProducts/list-products.usecase';

describe('ListProductsController', () => {
  let controller: ListProductsController;
  let mockListProductsUseCase: jest.Mocked<ListProductsUseCase>;
  let expectedProducts: Product[];

  beforeEach(() => {
    // Mock the ListProductsUseCase
    mockListProductsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListProductsUseCase>;

    controller = new ListProductsController(mockListProductsUseCase);
  });

  describe('handle', () => {
    it('should return success if any Product is found', async () => {
      expectedProducts = [
        new Product({
          id: 1,
          name: 'Car',
          description: 'A fast red sports car',
          price: 35000,
          sku: 'CAR-001',
          stockQuantity: 10,
          createdAt: new Date('2025-01-01T10:00:00Z'),
          updatedAt: new Date('2025-08-13T15:00:00Z'),
        }),
      ];

      mockListProductsUseCase.execute.mockResolvedValue(
        Result.success(expectedProducts),
      );

      const result = await controller.handle();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(expectedProducts);
      }
      expect(mockListProductsUseCase.execute).toHaveBeenCalledWith();
      expect(mockListProductsUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if no product is found', async () => {
      mockListProductsUseCase.execute.mockResolvedValue(
        Result.failure(ErrorFactory.UseCaseError(`Products not found`).error),
      );

      const result = await controller.handle();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Controller failed to get products');
        expect(result.error.cause?.message).toBe(`Products not found`);
      }

      expect(mockListProductsUseCase.execute).toHaveBeenCalledWith();
      expect(mockListProductsUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const error = new Error('Database connection failed');

      mockListProductsUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle();
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

      expect(mockListProductsUseCase.execute).toHaveBeenCalledWith();
      expect(mockListProductsUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
