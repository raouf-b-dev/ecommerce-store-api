// src/modules/Products/presentation/controllers/Update-Product.controller.spec.ts
import { UpdateProductController } from './update-product.controller';
import { Product } from '../../../domain/entities/product';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UpdateProductUseCase } from '../../../application/usecases/UpdateProduct/update-product.usecase';
import { UpdateProductDto } from '../../dto/update-product.dto';

describe('UpdateProductController', () => {
  let controller: UpdateProductController;
  let updateProductDto: UpdateProductDto;
  let productId: string;

  let mockUpdateProductUseCase: jest.Mocked<UpdateProductUseCase>;
  let product: Product;

  beforeEach(() => {
    // Mock the UpdateProductUseCase
    mockUpdateProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateProductUseCase>;
    productId = 'PR0000001';

    controller = new UpdateProductController(mockUpdateProductUseCase);

    updateProductDto = {
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    } as UpdateProductDto;

    product = new Product({
      id: productId,
      name: 'car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    });
  });

  describe('handle', () => {
    it('should return success if product if updated', async () => {
      mockUpdateProductUseCase.execute.mockResolvedValue(
        Result.success(product),
      );

      const result = await controller.handle(productId, updateProductDto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(product);
      }
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith({
        id: productId,
        dto: updateProductDto,
      });
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if product is not updated', async () => {
      mockUpdateProductUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(`Failed to update product`).error,
        ),
      );

      const result = await controller.handle(productId, updateProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe(
          'Controller failed to Update product',
        );
        expect(result.error.cause?.message).toBe(`Failed to update product`);
      }

      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith({
        id: productId,
        dto: updateProductDto,
      });
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const error = new Error('Database connection failed');

      mockUpdateProductUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(productId, updateProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith({
        id: productId,
        dto: updateProductDto,
      });
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
