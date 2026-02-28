// src/modules/Products/application/usecases/update-product/update-product.usecase.spec.ts
import { UpdateProductUseCase } from './update-product.usecase';
import { MockProductRepository } from '../../../../testing/mocks/product-repository.mock';
import { ProductTestFactory } from '../../../../testing/factories/product.factory';
import { UpdateProductDtoFactory } from '../../../../testing/factories/update-product-dto.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let mockRepository: MockProductRepository;

  beforeEach(() => {
    mockRepository = new MockProductRepository();
    useCase = new UpdateProductUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if product is updated', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();
      const updatedProduct = ProductTestFactory.createMockProduct({
        id: productId,
        name: 'Updated Product',
      });

      mockRepository.mockSuccessfulUpdate(updatedProduct);

      const result = await useCase.execute({ id: productId, dto: updateDto });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.name).toBe('Updated Product');
      expect(mockRepository.update).toHaveBeenCalledWith(productId, updateDto);
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if product is not updated', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();

      mockRepository.mockUpdateFailure('Failed to update product');

      const result = await useCase.execute({ id: productId, dto: updateDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update product',
        UseCaseError,
      );
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();
      const repoError = new Error('Database connection failed');

      mockRepository.update.mockRejectedValue(repoError);

      const result = await useCase.execute({ id: productId, dto: updateDto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );
    });

    it('should update only price', async () => {
      const productId = 1;
      const priceOnlyDto = UpdateProductDtoFactory.createPriceOnlyDto(200);
      const updatedProduct = ProductTestFactory.createMockProduct({
        id: productId,
        price: 200,
      });

      mockRepository.mockSuccessfulUpdate(updatedProduct);

      const result = await useCase.execute({
        id: productId,
        dto: priceOnlyDto,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(200);
    });
  });
});
