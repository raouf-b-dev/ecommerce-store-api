import { HttpStatus } from '@nestjs/common';
import {
  MockCategoryRepository,
  MockProductRepository,
  ProductTestFactory,
  UpdateProductInputFactory,
} from 'src/modules/products/testing';
import { UpdateProductUseCase } from './update-product.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Product } from '../../../domain/entities/product';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let mockRepository: MockProductRepository;
  let mockCategoryRepository: MockCategoryRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    mockCategoryRepository = new MockCategoryRepository();
    mockCategoryRepository.mockSuccessfulFindById();
    useCase = new UpdateProductUseCase(mockRepository, mockCategoryRepository);
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

    it('should return Failure(UseCaseError) if product is not found', async () => {
      const productId = 999;
      const command = UpdateProductInputFactory.createMockDto({
        id: productId,
      });

      mockRepository.mockProductNotFound(productId);

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        `Product with id ${productId} not found`,
        UseCaseError,
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
      expect(result.isFailure && result.error.statusCode).toBe(
        HttpStatus.BAD_REQUEST,
      );
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
      expect(result.isFailure && result.error.statusCode).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect(mockRepository.findByIdForUpdate).not.toHaveBeenCalled();
    });
  });
});
