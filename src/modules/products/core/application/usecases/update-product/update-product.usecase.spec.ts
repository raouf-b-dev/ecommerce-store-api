import { UpdateProductUseCase } from './update-product.usecase';
import { MockProductRepository } from '../../../../testing/mocks/product-repository.mock';
import { ProductTestFactory } from '../../../../testing/factories/product.factory';
import { UpdateProductInputFactory } from '../../../../testing/factories/update-product-input.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Product } from '../../../domain/entities/product';

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
  });
});
