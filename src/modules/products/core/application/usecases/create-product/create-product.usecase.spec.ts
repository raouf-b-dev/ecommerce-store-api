import { HttpStatus } from '@nestjs/common';
import {
  CreateProductInputFactory,
  MockCategoryRepository,
  MockProductRepository,
  MockSupportedCurrenciesAdapter,
} from 'src/modules/products/testing';
import { CreateProductUseCase } from './create-product.usecase';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockRepository: MockProductRepository;
  let mockCategoryRepository: MockCategoryRepository;
  let mockSupportedCurrencies: MockSupportedCurrenciesAdapter;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    mockCategoryRepository = new MockCategoryRepository();
    mockCategoryRepository.mockSuccessfulFindById();
    mockSupportedCurrencies = new MockSupportedCurrenciesAdapter(['USD']);
    useCase = new CreateProductUseCase(
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
    it('should return Success if product is created', async () => {
      const command = CreateProductInputFactory.createMockDto();

      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.name).toBe('Test Product');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(
        command.categoryId,
      );
    });

    it('should return BAD_REQUEST when categoryId is missing', async () => {
      const command = CreateProductInputFactory.createMockDto({
        categoryId: undefined,
      });

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'categoryId is required',
        UseCaseError,
      );
      expect(result.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockCategoryRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('returns the repository failure when the product is not saved', async () => {
      const command = CreateProductInputFactory.createMockDto();

      mockRepository.mockSaveFailure('Failed to save product');

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
        RepositoryError,
      );
    });

    it('should create expensive product', async () => {
      const expensiveCommand =
        CreateProductInputFactory.createExpensiveProductDto();

      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(expensiveCommand);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(35000);
    });

    it('should return BAD_REQUEST when categoryId is unknown', async () => {
      const command = CreateProductInputFactory.createMockDto({
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
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return BAD_REQUEST when currency is not supported by the store', async () => {
      const command = CreateProductInputFactory.createMockDto({
        currency: 'EUR',
      });

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Currency "EUR" is not supported by this store',
        UseCaseError,
      );
      expect(result.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('creates product with JPY (0 decimal places) when supported', async () => {
      mockSupportedCurrencies = new MockSupportedCurrenciesAdapter([
        'USD',
        'JPY',
      ]);
      useCase = new CreateProductUseCase(
        mockRepository,
        mockCategoryRepository,
        mockSupportedCurrencies,
      );
      const command = CreateProductInputFactory.createMockDto({
        price: 1500,
        currency: 'JPY',
      });
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.currency).toBe('JPY');
      expect(result.value.price).toBe(1500);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return BAD_REQUEST when currency code is invalid', async () => {
      const command = CreateProductInputFactory.createMockDto({
        currency: 'INVALID',
      });

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Currency must be a 3-letter code (ISO 4217)',
        UseCaseError,
      );
      expect(result.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('normalizes lowercase currency to uppercase when creating product', async () => {
      const command = CreateProductInputFactory.createMockDto({
        currency: 'usd',
      });
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.currency).toBe('USD');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
