import { MockInventoryRepository } from '../../../testing/mocks/inventory-repository.mock';
import { GetInventoryUseCase } from './get-inventory.usecase';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';
import { IInventory } from '../../domain/interfaces/inventory.interface';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';

describe('GetInventoryUseCase', () => {
  let usecase: GetInventoryUseCase;
  let mockInventoryRepository: MockInventoryRepository;
  const inventoryFactory = InventoryTestFactory;

  beforeEach(() => {
    mockInventoryRepository = new MockInventoryRepository();
    usecase = new GetInventoryUseCase(mockInventoryRepository);
  });

  afterEach(() => {
    mockInventoryRepository.reset();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  it('should return the inventory primitives on success', async () => {
    // Arrange
    const productId = 123;
    const mockInventory: IInventory =
      inventoryFactory.createInventoryForProduct(productId);

    mockInventoryRepository.mockSuccessfulFindByProductId(mockInventory);

    // Act
    const result = await usecase.execute(productId);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(mockInventory);
    expect(mockInventoryRepository.findByProductId).toHaveBeenCalledWith(
      productId,
    );
    expect(mockInventoryRepository.findByProductId).toHaveBeenCalledTimes(1);
  });

  it('should return a failure result if the inventory is not found', async () => {
    // Arrange
    const productId = 404;
    const expectedMsg = `Inventory not found for product ${productId}`;

    mockInventoryRepository.mockInventoryNotFoundForProduct(productId);

    // Act
    const result = await usecase.execute(productId);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      expectedMsg,
      RepositoryError,
    );
    expect(mockInventoryRepository.findByProductId).toHaveBeenCalledWith(
      productId,
    );
  });

  it('should return a UseCaseError on unexpected exceptions', async () => {
    // Arrange
    const productId = 500;
    const mockError = new Error('Database connection failed');

    mockInventoryRepository.findByProductId.mockRejectedValue(mockError);

    // Act
    const result = await usecase.execute(productId);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected UseCase Error',
      UseCaseError,
      mockError,
    );
    expect(mockInventoryRepository.findByProductId).toHaveBeenCalledWith(
      productId,
    );
  });
});
