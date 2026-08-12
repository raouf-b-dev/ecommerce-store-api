import {
  MockProductQueryService,
  ProductDtoTestFactory,
} from 'src/modules/products/testing';
import { ListProductsUseCase } from './list-products.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('ListProductsUseCase', () => {
  let useCase: ListProductsUseCase;
  let mockQueryService: MockProductQueryService;

  beforeEach(() => {
    mockQueryService = new MockProductQueryService();
    useCase = new ListProductsUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  describe('execute', () => {
    it('should return Success if products are found', async () => {
      const sampleItem = ProductDtoTestFactory.createProductListItemDTO();
      mockQueryService.mockSuccessfulList([sampleItem], 1);

      const result = await useCase.execute({ page: 1, limit: 10 });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toEqual([sampleItem]);
      expect(mockQueryService.list).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });
});
