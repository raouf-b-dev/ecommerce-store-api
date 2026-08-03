import { ListProductsUseCase } from './list-products.usecase';
import { MockProductRepository } from '../../../../testing/mocks/product-repository.mock';
import { ProductTestFactory } from '../../../../testing/factories/product.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Product } from '../../../domain/entities/product';

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
      const mockList = ProductTestFactory.createProductList(5);
      const products = mockList.map((p) => Product.fromPrimitives(p));

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

    it('should return mixed product types', async () => {
      const mockList = [
        ProductTestFactory.createInStockProduct(),
        ProductTestFactory.createLowStockProduct(),
        ProductTestFactory.createOutOfStockProduct(),
      ];
      const products = mockList.map((p) => Product.fromPrimitives(p));

      mockRepository.mockSuccessfulList(products);

      const result = await useCase.execute();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(3);
    });
  });
});
