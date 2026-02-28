// src/modules/Products/application/usecases/delete-product/delete-product.usecase.spec.ts
import { DeleteProductUseCase } from './delete-product.usecase';
import { MockProductRepository } from '../../../../testing/mocks/product-repository.mock';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase;
  let mockRepository: MockProductRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    useCase = new DeleteProductUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if product is deleted', async () => {
      const productId = 1;

      mockRepository.mockSuccessfulDelete();

      const result = await useCase.execute(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeUndefined();
      expect(mockRepository.deleteById).toHaveBeenCalledWith(productId);
      expect(mockRepository.deleteById).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not deleted', async () => {
      const productId = 1;

      mockRepository.mockDeleteFailure(
        `Product with id ${productId} not deleted`,
      );

      const result = await useCase.execute(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Product with id 1 not deleted',
        UseCaseError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const productId = 1;
      const repoError = new Error('Database connection failed');

      mockRepository.deleteById.mockRejectedValue(repoError);

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
