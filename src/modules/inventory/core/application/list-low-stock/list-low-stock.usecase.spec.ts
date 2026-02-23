import { ListLowStockUseCase } from './list-low-stock.usecase';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';
import { InventoryDtoTestFactory } from '../../../testing/factories/inventory-dto.test.factory';
import { MockInventoryRepository } from '../../../testing/mocks/inventory-repository.mock';

describe('ListLowStockUseCase', () => {
  let usecase: ListLowStockUseCase;
  let mockRepo: MockInventoryRepository;

  beforeEach(async () => {
    mockRepo = new MockInventoryRepository();
    usecase = new ListLowStockUseCase(mockRepo);
  });

  afterEach(() => {
    mockRepo.reset();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  it('should return a list of low stock inventories', async () => {
    // Arrange
    const query = InventoryDtoTestFactory.createLowStockQueryDto({
      threshold: 10,
    });
    const lowStockPrimitive1 = InventoryTestFactory.createLowStockInventory({
      id: 1,
    });
    const lowStockPrimitive2 = InventoryTestFactory.createLowStockInventory({
      id: 2,
    });

    // Use the mock helper
    mockRepo.mockSuccessfulFindLowStock([
      lowStockPrimitive1,
      lowStockPrimitive2,
    ]);

    // Act
    const result = await usecase.execute(query);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findLowStock).toHaveBeenCalledWith(query);
    // The mock's `fromPrimitives` and the use case's `toPrimitives`
    // result in the same plain object.
    expect(result.value).toEqual([lowStockPrimitive1, lowStockPrimitive2]);
    expect(result.value.length).toBe(2);
  });

  it('should return an empty list if no items are low stock', async () => {
    // Arrange
    const query = InventoryDtoTestFactory.createLowStockQueryDto({
      threshold: 5,
    });
    // Use the mock helper
    mockRepo.mockEmptyLowStock();

    // Act
    const result = await usecase.execute(query);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findLowStock).toHaveBeenCalledWith(query);
    expect(result.value).toEqual([]);
    expect(result.value.length).toBe(0);
  });

  it('should return a failure if the repository fails', async () => {
    // Arrange
    const query = InventoryDtoTestFactory.createLowStockQueryDto();
    const repoError = ErrorFactory.RepositoryError(
      'Database connection failed',
    );
    mockRepo.findLowStock.mockResolvedValue(repoError);

    // Act
    const result = await usecase.execute(query);

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(result, repoError.error);
    expect(mockRepo.findLowStock).toHaveBeenCalledWith(query);
  });

  it('should return a use case error on unexpected exceptions', async () => {
    // Arrange
    const query = InventoryDtoTestFactory.createLowStockQueryDto();
    const unexpectedError = new Error('Something exploded');
    mockRepo.findLowStock.mockRejectedValue(unexpectedError);

    // Act
    const result = await usecase.execute(query);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected UseCase Error',
      UseCaseError,
      unexpectedError,
    );
    expect(mockRepo.findLowStock).toHaveBeenCalledWith(query);
  });
});
