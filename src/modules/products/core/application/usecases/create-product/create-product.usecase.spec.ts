// src/modules/Products/application/usecases/create-product/create-product.usecase.spec.ts
import { CreateProductUseCase } from './create-product.usecase';
import { MockProductRepository } from '../../../../testing/mocks/product-repository.mock';
import { ProductTestFactory } from '../../../../testing/factories/product.factory';
import { CreateProductDtoFactory } from '../../../../testing/factories/create-product-dto.factory';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockRepository: MockProductRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    useCase = new CreateProductUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if product is created', async () => {
      const createDto = CreateProductDtoFactory.createMockDto();
      const product = ProductTestFactory.createMockProduct();

      mockRepository.mockSuccessfulSave(product);

      const result = await useCase.execute(createDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(product);
      expect(mockRepository.save).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not created', async () => {
      const createDto = CreateProductDtoFactory.createMockDto();

      mockRepository.mockSaveFailure('Failed to save product');

      const result = await useCase.execute(createDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
        UseCaseError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const createDto = CreateProductDtoFactory.createMockDto();
      const repoError = new Error('Database connection failed');

      mockRepository.save.mockRejectedValue(repoError);

      const result = await useCase.execute(createDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });

    it('should create expensive product', async () => {
      const expensiveDto = CreateProductDtoFactory.createExpensiveProductDto();
      const expensiveProduct = ProductTestFactory.createExpensiveProduct();

      mockRepository.mockSuccessfulSave(expensiveProduct);

      const result = await useCase.execute(expensiveDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(35000);
    });
  });
});
