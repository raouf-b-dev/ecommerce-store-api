import {
  MockProductQueryService,
  ProductDtoTestFactory,
} from 'src/modules/products/testing';
import { ListProductsUseCase } from './list-products.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { VIEW_ALL_PRODUCTS_PERMISSION } from '../../../domain/policies/catalog-visibility.policy';

describe('ListProductsUseCase', () => {
  let useCase: ListProductsUseCase;
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
    useCase = new ListProductsUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  describe('execute', () => {
    it('passes operator filters through unchanged', async () => {
      const sampleItem = ProductDtoTestFactory.createProductListItemDTO();
      mockQueryService.mockSuccessfulList([sampleItem], 1);

      const result = await useCase.execute({ page: 1, limit: 10 }, operator);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toEqual([sampleItem]);
      expect(mockQueryService.list).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('forces isActive true for shoppers even when they request inactive', async () => {
      mockQueryService.mockSuccessfulList([], 0);

      await useCase.execute({ isActive: false, search: 'desk' }, customer);

      expect(mockQueryService.list).toHaveBeenCalledWith({
        isActive: true,
        search: 'desk',
      });
    });

    it('forces isActive true when unauthenticated', async () => {
      mockQueryService.mockSuccessfulList([], 0);

      await useCase.execute({ page: 1, limit: 10 });

      expect(mockQueryService.list).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        isActive: true,
      });
    });
  });
});
