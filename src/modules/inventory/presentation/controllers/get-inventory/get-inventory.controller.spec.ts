import { GetInventoryUseCase } from '../../../application/get-inventory/get-inventory.usecase';
import { GetInventoryController } from './get-inventory.controller';
import { Result } from '../../../../../core/domain/result';
import { IInventory } from '../../../domain/interfaces/inventory.interface';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { RepositoryError } from '../../../../../core/errors/repository.error';

describe('GetInventoryController', () => {
  let usecase: jest.Mocked<GetInventoryUseCase>;
  let controller: GetInventoryController;

  const inventoryFactory = InventoryTestFactory;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new GetInventoryController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return the inventory on success', async () => {
    // Arrange
    const productId = 'prod-123';
    const mockInventory: IInventory =
      inventoryFactory.createInventoryForProduct(productId);

    usecase.execute.mockResolvedValue(Result.success(mockInventory));

    // Act
    const result = await controller.handle(productId);

    // Assert
    expect(usecase.execute).toHaveBeenCalledWith(productId);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(mockInventory);
  });

  it('should return a failure result if the use case fails', async () => {
    // Arrange
    const productId = 'prod-404';
    const mockError = new RepositoryError('Inventory not found');

    usecase.execute.mockResolvedValue(Result.failure(mockError));

    // Act
    const result = await controller.handle(productId);

    // Assert
    expect(usecase.execute).toHaveBeenCalledWith(productId);
    ResultAssertionHelper.assertResultFailureWithError(result, mockError);
  });

  it('should return a ControllerError on unexpected exceptions', async () => {
    // Arrange
    const productId = 'prod-500';
    const mockError = new Error('Database connection failed');

    usecase.execute.mockRejectedValue(mockError);

    // Act
    const result = await controller.handle(productId);

    // Assert
    expect(usecase.execute).toHaveBeenCalledWith(productId);
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      mockError,
    );
  });
});
