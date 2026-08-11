import { ListInventoryUseCase } from './list-inventory.usecase';
import { InventoryDtoTestFactory } from 'src/modules/inventory/testing/factories/inventory-dto.factory';
import { MockInventoryQueryService } from 'src/modules/inventory/testing/mocks/inventory-query-service.mock';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';

describe('ListInventoryUseCase', () => {
  let useCase: ListInventoryUseCase;
  let mockQueryService: MockInventoryQueryService;

  const sampleItem = InventoryDtoTestFactory.createInventoryListItemDTO({
    id: 1,
    productId: 100,
  });

  beforeEach(() => {
    mockQueryService = new MockInventoryQueryService();
    useCase = new ListInventoryUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('should call InventoryQueryService.list and return paginated result', async () => {
    mockQueryService.mockSuccessfulList([sampleItem], 1);

    const result = await useCase.execute({ page: 1, limit: 10 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.items).toEqual([sampleItem]);
    expect(result.value.total).toBe(1);
    expect(mockQueryService.list).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });
});
