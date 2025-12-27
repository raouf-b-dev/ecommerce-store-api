// src/modules/Products/presentation/controllers/Update-Product.controller.spec.ts
import { UpdateProductController } from './update-product.controller';
import { UpdateProductUseCase } from '../../../application/usecases/update-product/update-product.usecase';
import { ProductTestFactory } from '../../../testing/factories/product.factory';
import { UpdateProductDtoFactory } from '../../../testing/factories/update-product-dto.factory';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { ResultAssertionHelper } from '../../../../../testing';

describe('UpdateProductController', () => {
  let controller: UpdateProductController;
  let mockUpdateProductUseCase: jest.Mocked<UpdateProductUseCase>;

  beforeEach(() => {
    mockUpdateProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateProductUseCase>;

    controller = new UpdateProductController(mockUpdateProductUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return success if product is updated', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();
      const product = ProductTestFactory.createMockProduct({ id: productId });

      mockUpdateProductUseCase.execute.mockResolvedValue(
        Result.success(product),
      );

      const result = await controller.handle(productId, updateDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(product);
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith({
        id: productId,
        dto: updateDto,
      });
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if product is not updated', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();

      mockUpdateProductUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError('Failed to update product').error,
        ),
      );

      const result = await controller.handle(productId, updateDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Controller failed to Update product',
        ControllerError,
      );
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith({
        id: productId,
        dto: updateDto,
      });
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();
      const error = new Error('Database connection failed');

      mockUpdateProductUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(productId, updateDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected controller error',
        ControllerError,
        error,
      );
    });

    it('should update only price', async () => {
      const productId = 1;
      const priceOnlyDto = UpdateProductDtoFactory.createPriceOnlyDto(200);
      const product = ProductTestFactory.createMockProduct({
        id: productId,
        price: 200,
      });

      mockUpdateProductUseCase.execute.mockResolvedValue(
        Result.success(product),
      );

      const result = await controller.handle(productId, priceOnlyDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(200);
    });
  });
});
