import { GetInventoryUseCase } from './get-inventory.usecase';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { InventoryDtoTestFactory } from 'src/modules/inventory/testing/factories/inventory-dto.factory';
import { MockInventoryQueryService } from 'src/modules/inventory/testing/mocks/inventory-query-service.mock';

describe('GetInventoryUseCase', () => {
  let usecase: GetInventoryUseCase;
  let mockQueryService: MockInventoryQueryService;

  const sampleItem = InventoryDtoTestFactory.createInventoryListItemDTO({
    id: 10,
    productId: 123,
  });

  beforeEach(() => {
    mockQueryService = new MockInventoryQueryService();
    usecase = new GetInventoryUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  it('should return inventory presentation DTO on success', async () => {
    const productId = 123;
    mockQueryService.mockSuccessfulGetByProductId(sampleItem);

    const result = await usecase.execute(productId);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(sampleItem);
    expect(mockQueryService.getByProductId).toHaveBeenCalledWith(productId);
  });

  it('should return failure if inventory for product is not found', async () => {
    const productId = 404;
    mockQueryService.mockSuccessfulGetByProductId(null);

    const result = await usecase.execute(productId);

    ResultAssertionHelper.assertResultFailure(
      result,
      `Inventory for product ID ${productId} not found`,
    );
  });
});
