import { HttpStatus } from '@nestjs/common';
import {
  MockProductRepository,
  ProductTestFactory,
} from 'src/modules/products/testing';
import { DeactivateProductUseCase } from './deactivate-product.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';

describe('DeactivateProductUseCase', () => {
  let usecase: DeactivateProductUseCase;
  let productRepository: MockProductRepository;

  beforeEach(() => {
    productRepository = new MockProductRepository();
    usecase = new DeactivateProductUseCase(productRepository);
  });

  it('should deactivate an active product', async () => {
    const product = ProductTestFactory.createDomainProduct({ isActive: true });
    productRepository.mockSuccessfulFindByIdForUpdate(product);
    productRepository.mockSuccessfulSave();

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(productRepository.save).toHaveBeenCalled();
  });

  it('should return failure if product is already inactive', async () => {
    const product = ProductTestFactory.createDomainProduct({ isActive: false });
    productRepository.mockSuccessfulFindByIdForUpdate(product);

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Product is already inactive',
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
