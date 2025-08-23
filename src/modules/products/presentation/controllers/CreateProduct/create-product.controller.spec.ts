// src/modules/Products/presentation/controllers/Create-Product.controller.spec.ts
import { CreateProductController } from './create-product.controller';
import { Product } from '../../../domain/entities/product';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { CreateProductUseCase } from '../../../application/usecases/CreateProduct/create-product.usecase';
import { CreateProductDto } from '../../dto/create-product.dto';

describe('CreateProductController', () => {
  let controller: CreateProductController;
  let mockCreateProductUseCase: jest.Mocked<CreateProductUseCase>;
  let product: Product;
  let createProductDto: CreateProductDto;

  beforeEach(() => {
    // Mock the CreateProductUseCase
    mockCreateProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateProductUseCase>;

    controller = new CreateProductController(mockCreateProductUseCase);

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
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
    } as CreateProductDto;
  });

  describe('handle', () => {
    it('should return success if product if created', async () => {
      mockCreateProductUseCase.execute.mockResolvedValue(
        Result.success(product),
      );

      const result = await controller.handle(createProductDto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(product);
      }
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith(
        createProductDto,
      );
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if product is not created', async () => {
      mockCreateProductUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(`Failed to save product`).error,
        ),
      );

      const result = await controller.handle(createProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe(
          'Controller failed to create product',
        );
        expect(result.error.cause?.message).toBe(`Failed to save product`);
      }

      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith(
        createProductDto,
      );
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const error = new Error('Database connection failed');

      mockCreateProductUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(createProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith(
        createProductDto,
      );
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
