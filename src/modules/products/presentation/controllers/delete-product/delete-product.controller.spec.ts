// src/modules/Products/presentation/controllers/Delete-Product.controller.spec.ts
import { DeleteProductController } from './delete-product.controller';
import { DeleteProductUseCase } from '../../../application/usecases/delete-product/delete-product.usecase';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { ResultAssertionHelper } from '../../../../../testing';

describe('DeleteProductController', () => {
  let controller: DeleteProductController;
  let mockDeleteProductUseCase: jest.Mocked<DeleteProductUseCase>;

  beforeEach(() => {
    mockDeleteProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteProductUseCase>;

    controller = new DeleteProductController(mockDeleteProductUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return success if Product is deleted', async () => {
      const productId = 1;

      mockDeleteProductUseCase.execute.mockResolvedValue(
        Result.success(undefined),
      );

      const result = await controller.handle(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeUndefined();
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if product is not deleted', async () => {
      const productId = 1;

      mockDeleteProductUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(`Product with id ${productId} not deleted`)
            .error,
        ),
      );

      const result = await controller.handle(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Controller failed to delete product',
        ControllerError,
      );
      expect(mockDeleteProductUseCase.execute).toHaveBeenCalledWith(productId);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const productId = 1;
      const error = new Error('Database connection failed');

      mockDeleteProductUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected controller error',
        ControllerError,
        error,
      );
    });
  });
});
