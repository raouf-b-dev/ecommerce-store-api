// src/modules/Products/presentation/controllers/get-Product.controller.spec.ts
import { GetProductController } from './get-product.controller';
import { GetProductUseCase } from '../../../application/usecases/get-product/get-product.usecase';
import { ProductTestFactory } from '../../../testing/factories/product.factory';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { ResultAssertionHelper } from '../../../../../testing';

describe('GetProductController', () => {
  let controller: GetProductController;
  let mockGetProductUseCase: jest.Mocked<GetProductUseCase>;

  beforeEach(() => {
    mockGetProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetProductUseCase>;

    controller = new GetProductController(mockGetProductUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return success if Product is found', async () => {
      const productId = 1;
      const product = ProductTestFactory.createMockProduct({ id: productId });

      mockGetProductUseCase.execute.mockResolvedValue(Result.success(product));

      const result = await controller.handle(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(product);
      expect(mockGetProductUseCase.execute).toHaveBeenCalledWith(productId);
      expect(mockGetProductUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if product is not found', async () => {
      const productId = 1;

      mockGetProductUseCase.execute.mockResolvedValue(
        Result.failure(
          ErrorFactory.UseCaseError(`Product with id ${productId} not found`)
            .error,
        ),
      );

      const result = await controller.handle(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Controller failed to get product',
        ControllerError,
      );
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const productId = 1;
      const error = new Error('Database connection failed');

      mockGetProductUseCase.execute.mockRejectedValue(error);

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
