// src/modules/Products/application/usecases/list-products/list-products.usecase.spec.ts
import { ListProductsUseCase } from './list-products.usecase';
import { MockProductRepository } from '../../../../testing/mocks/product-repository.mock';
import { ProductTestFactory } from '../../../../testing/factories/product.factory';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('ListProductsUseCase', () => {
  let useCase: ListProductsUseCase;
  let mockRepository: MockProductRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    useCase = new ListProductsUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if products are found', async () => {
      const products = ProductTestFactory.createProductList(5);

      mockRepository.mockSuccessfulList(products);

      const result = await useCase.execute();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(5);
      expect(mockRepository.findAll).toHaveBeenCalledWith();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if no product is found', async () => {
      mockRepository.mockListFailure('Products not found');

      const result = await useCase.execute();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Products not found',
        UseCaseError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const repoError = new Error('Database connection failed');

      mockRepository.findAll.mockRejectedValue(repoError);

      const result = await useCase.execute();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });

    it('should return mixed product types', async () => {
      const products = [
        ProductTestFactory.createInStockProduct(),
        ProductTestFactory.createLowStockProduct(),
        ProductTestFactory.createOutOfStockProduct(),
      ];

      mockRepository.mockSuccessfulList(products);

      const result = await useCase.execute();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(3);
    });
  });
});
