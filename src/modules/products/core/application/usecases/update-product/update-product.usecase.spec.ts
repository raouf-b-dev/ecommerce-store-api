import { HttpStatus } from '@nestjs/common';
import {
  MockCategoryRepository,
  MockProductRepository,
  MockSupportedCurrenciesAdapter,
  ProductTestFactory,
  UpdateProductInputFactory,
} from 'src/modules/products/testing';
import { UpdateProductUseCase } from './update-product.usecase';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Product } from '../../../domain/entities/product';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let mockRepository: MockProductRepository;
  let mockCategoryRepository: MockCategoryRepository;
  let mockSupportedCurrencies: MockSupportedCurrenciesAdapter;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    mockCategoryRepository = new MockCategoryRepository();
    mockCategoryRepository.mockSuccessfulFindById();
    mockSupportedCurrencies = new MockSupportedCurrenciesAdapter(['USD']);
    useCase = new UpdateProductUseCase(
      mockRepository,
      mockCategoryRepository,
      mockSupportedCurrencies,
    );
  });

  afterEach(() => {
    mockRepository.reset();
    mockCategoryRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if product is updated', async () => {
      const productId = 1;
      const command = UpdateProductInputFactory.createMockDto({
        id: productId,
        name: 'Updated Product',
      });
      const existingProduct = Product.fromPrimitives(
        ProductTestFactory.createMockProduct({
          id: productId,
          name: 'Old Product',
        }),
      );

      mockRepository.mockSuccessfulFindByIdForUpdate(existingProduct, 1);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.name).toBe('Updated Product');
      expect(mockRepository.findByIdForUpdate).toHaveBeenCalledWith(productId);
      expect(mockRepository.save).toHaveBeenCalledWith(existingProduct, 1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockCategoryRepository.findById).not.toHaveBeenCalled();
    });

    it('returns the repository failure when the product is not found', async () => {
      const productId = 999;
      const command = UpdateProductInputFactory.createMockDto({
        id: productId,
      });

      mockRepository.mockProductNotFound(productId);

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        `Product with id ${productId} not found`,
        RepositoryError,
      );
    });

    it('should update only price', async () => {
      const productId = 1;
      const command = UpdateProductInputFactory.createPriceOnlyDto(200);
      const existingProduct = Product.fromPrimitives(
        ProductTestFactory.createMockProduct({ id: productId, price: 100 }),
      );

      mockRepository.mockSuccessfulFindByIdForUpdate(existingProduct, 2);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(200);
      expect(mockRepository.save).toHaveBeenCalledWith(existingProduct, 2);
    });

    it('should return BAD_REQUEST when categoryId is explicitly null', async () => {
      const command = UpdateProductInputFactory.createMockDto({
        categoryId: null,
      });

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'categoryId cannot be null',
        UseCaseError,
      );
      expect(result.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockCategoryRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.findByIdForUpdate).not.toHaveBeenCalled();
    });

    it('should return BAD_REQUEST when categoryId is unknown', async () => {
      const command = UpdateProductInputFactory.createMockDto({
        categoryId: 99,
      });
      mockCategoryRepository.mockMissingCategory();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Category with id 99 not found',
        UseCaseError,
      );
      expect(result.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockRepository.findByIdForUpdate).not.toHaveBeenCalled();
    });

    it('should return BAD_REQUEST when updating with an unsupported currency', async () => {
      const productId = 1;
      const command = UpdateProductInputFactory.createMockDto({
        id: productId,
        currency: 'EUR',
      });
      const existingProduct = Product.fromPrimitives(
        ProductTestFactory.createMockProduct({
          id: productId,
          currency: 'USD',
        }),
      );

      mockRepository.mockSuccessfulFindByIdForUpdate(existingProduct, 1);

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Currency "EUR" is not supported by this store',
        UseCaseError,
      );
      expect(result.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('allows partial update when product has legacy unsupported currency and currency is omitted', async () => {
      const productId = 1;
      const command = UpdateProductInputFactory.createMockDto({
        id: productId,
        name: 'New Name Only',
      });
      const legacyProductWithUnsupportedCurrency = Product.fromPrimitives(
        ProductTestFactory.createMockProduct({
          id: productId,
          name: 'Old Name',
          currency: 'GBP',
        }),
      );

      mockRepository.mockSuccessfulFindByIdForUpdate(
        legacyProductWithUnsupportedCurrency,
        1,
      );
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.name).toBe('New Name Only');
      expect(result.value.currency).toBe('GBP');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('updates product with JPY (0 decimal places) when supported', async () => {
      mockSupportedCurrencies = new MockSupportedCurrenciesAdapter([
        'USD',
        'JPY',
      ]);
      useCase = new UpdateProductUseCase(
        mockRepository,
        mockCategoryRepository,
        mockSupportedCurrencies,
      );
      const productId = 1;
      const command = UpdateProductInputFactory.createMockDto({
        id: productId,
        price: 2500,
        currency: 'JPY',
      });
      const existingProduct = Product.fromPrimitives(
        ProductTestFactory.createMockProduct({
          id: productId,
          price: 1000,
          currency: 'USD',
        }),
      );

      mockRepository.mockSuccessfulFindByIdForUpdate(existingProduct, 1);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.currency).toBe('JPY');
      expect(result.value.price).toBe(2500);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('normalizes lowercase currency when updating product', async () => {
      mockSupportedCurrencies = new MockSupportedCurrenciesAdapter([
        'USD',
        'EUR',
      ]);
      useCase = new UpdateProductUseCase(
        mockRepository,
        mockCategoryRepository,
        mockSupportedCurrencies,
      );
      const productId = 1;
      const command = UpdateProductInputFactory.createMockDto({
        id: productId,
        currency: 'eur',
      });
      const existingProduct = Product.fromPrimitives(
        ProductTestFactory.createMockProduct({
          id: productId,
          currency: 'USD',
        }),
      );

      mockRepository.mockSuccessfulFindByIdForUpdate(existingProduct, 1);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.currency).toBe('EUR');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
