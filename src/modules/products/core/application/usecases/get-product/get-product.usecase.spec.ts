import {
  MockProductQueryService,
  ProductDtoTestFactory,
} from 'src/modules/products/testing';
import { GetProductUseCase } from './get-product.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { VIEW_ALL_PRODUCTS_PERMISSION } from '../../../domain/policies/catalog-visibility.policy';

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let mockQueryService: MockProductQueryService;

  const operator = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set([VIEW_ALL_PRODUCTS_PERMISSION]),
  });
  const customer = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  });

  beforeEach(() => {
    mockQueryService = new MockProductQueryService();
    useCase = new GetProductUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  describe('execute', () => {
    it('should return Success if product is found', async () => {
      const sampleDetail = ProductDtoTestFactory.createProductDetailDTO({
        id: 1,
      });
      mockQueryService.mockSuccessfulGetById(sampleDetail);

      const result = await useCase.execute(1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(1);
      expect(mockQueryService.getById).toHaveBeenCalledWith(1);
    });

    it('should return Failure(UseCaseError) if product is not found', async () => {
      mockQueryService.mockSuccessfulGetById(null);

      const result = await useCase.execute(999);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Product with id 999 not found',
        UseCaseError,
      );
      expect(result.isFailure && result.error.statusCode).toBe(404);
    });

    it('hides inactive products from shoppers as not found', async () => {
      mockQueryService.mockSuccessfulGetById(
        ProductDtoTestFactory.createProductDetailDTO({
          id: 4,
          isActive: false,
        }),
      );

      const result = await useCase.execute(4, customer);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Product with id 4 not found',
        UseCaseError,
      );
      expect(result.isFailure && result.error.statusCode).toBe(404);
    });

    it('returns inactive products to operators with view_all_products', async () => {
      const inactive = ProductDtoTestFactory.createProductDetailDTO({
        id: 4,
        isActive: false,
      });
      mockQueryService.mockSuccessfulGetById(inactive);

      const result = await useCase.execute(4, operator);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(inactive);
    });
  });
});
