// src/modules/Products/application/usecases/get-product/get-product.usecase.spec.ts
import { GetProductUseCase } from './get-product.usecase';
import { MockProductRepository } from '../../../testing/mocks/product-repository.mock';
import { ProductTestFactory } from '../../../testing/factories/product.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let mockRepository: MockProductRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    useCase = new GetProductUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if product is found', async () => {
      const productId = 1;
      const product = ProductTestFactory.createMockProduct({ id: productId });

      mockRepository.mockSuccessfulFind(product);

      const result = await useCase.execute(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(productId);
      expect(mockRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not found', async () => {
      const productId = 1;

      mockRepository.mockProductNotFound(productId);

      const result = await useCase.execute(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        `Product with id ${productId} not found`,
        UseCaseError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const productId = 1;
      const repoError = new Error('Database connection failed');

      mockRepository.findById.mockRejectedValue(repoError);

      const result = await useCase.execute(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });
  });
});
