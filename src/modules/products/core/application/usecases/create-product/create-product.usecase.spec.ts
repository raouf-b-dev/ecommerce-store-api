import { HttpStatus } from '@nestjs/common';
import {
  CreateProductInputFactory,
  MockCategoryRepository,
  MockProductRepository,
} from 'src/modules/products/testing';
import { CreateProductUseCase } from './create-product.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockRepository: MockProductRepository;
  let mockCategoryRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    mockCategoryRepository = new MockCategoryRepository();
    mockCategoryRepository.mockSuccessfulFindById();
    useCase = new CreateProductUseCase(mockRepository, mockCategoryRepository);
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
      expect(result.isFailure && result.error.statusCode).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect(mockCategoryRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return Failure(UseCaseError) if product is not created', async () => {
      const command = CreateProductInputFactory.createMockDto();

      mockRepository.mockSaveFailure('Failed to save product');

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save product',
        UseCaseError,
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
      expect(result.isFailure && result.error.statusCode).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
