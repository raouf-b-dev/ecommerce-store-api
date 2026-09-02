import { HttpStatus } from '@nestjs/common';
import {
  MockProductRepository,
  ProductTestFactory,
} from 'src/modules/products/testing';
import { ActivateProductUseCase } from './activate-product.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

describe('ActivateProductUseCase', () => {
  let usecase: ActivateProductUseCase;
  let productRepository: MockProductRepository;

  beforeEach(() => {
    productRepository = new MockProductRepository();
    usecase = new ActivateProductUseCase(productRepository);
  });

  it('should activate an inactive product', async () => {
    const product = ProductTestFactory.createDomainProduct({ isActive: false });
    productRepository.mockSuccessfulFindByIdForUpdate(product);
    productRepository.mockSuccessfulSave();

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(productRepository.save).toHaveBeenCalled();
  });

  it('should return failure if product is already active', async () => {
    const product = ProductTestFactory.createDomainProduct({ isActive: true });
    productRepository.mockSuccessfulFindByIdForUpdate(product);

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Product is already active',
      DomainError,
    );
    expect(productRepository.save).not.toHaveBeenCalled();
  });

  it('should return failure if product not found', async () => {
    productRepository.mockProductNotFound(999);

    const result = await usecase.execute(999);

    ResultAssertionHelper.assertResultFailure(
      result,
      `Product with id 999 not found`,
      UseCaseError,
    );
    if (result.isFailure)
      expect(result.error.statusCode).toBe(HttpStatus.NOT_FOUND);
  });
});
