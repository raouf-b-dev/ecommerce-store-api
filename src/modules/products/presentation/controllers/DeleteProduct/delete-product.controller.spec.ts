// src/modules/Products/presentation/controllers/Delete-Product.controller.spec.ts
import { DeleteProductController } from './delete-product.controller';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { DeleteProductUseCase } from '../../../application/usecases/DeleteProduct/delete-product.usecase';

describe('DeleteProductController', () => {
  let controller: DeleteProductController;
  let mockDeleteProductUseCase: jest.Mocked<DeleteProductUseCase>;
  let productId: string;

  beforeEach(() => {
    // Mock the DeleteProductUseCase
    mockDeleteProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteProductUseCase>;
    productId = 'PR0000001';

    controller = new DeleteProductController(mockDeleteProductUseCase);
  });

  describe('handle', () => {
    it('should return success if Product is deleted', async () => {
      mockDeleteProductUseCase.execute.mockResolvedValue(
        Result.success(undefined),
      );

      const result = await controller.handle(productId);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(undefined);
      }
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should rethrow Failure(ControllerError) if product is not deleted', async () => {
      mockDeleteProductUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(`Product with id ${productId} not deleted`)
            .error,
        ),
      );

      const result = await controller.handle(productId);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe(
          'Controller failed to delete product',
        );
        expect(result.error.cause?.message).toBe(
          `Product with id ${productId} not deleted`,
        );
      }

      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const error = new Error('Database connection failed');

      mockDeleteProductUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(productId);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
