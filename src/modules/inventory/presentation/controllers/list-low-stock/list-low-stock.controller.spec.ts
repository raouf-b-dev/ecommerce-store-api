// src/modules/inventory/presentation/controllers/list-low-stock.controller.spec.ts

import { ListLowStockUseCase } from '../../../application/list-low-stock/list-low-stock.usecase';
import { ListLowStockController } from './list-low-stock.controller';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { IInventory } from '../../../domain/interfaces/inventory.interface';
import { InventoryDtoTestFactory } from '../../../testing/factories/inventory-dto.test.factory';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';

describe('ListLowStockController', () => {
  let usecase: jest.Mocked<ListLowStockUseCase>;
  let controller: ListLowStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new ListLowStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a list of inventories on success', async () => {
    // Arrange
    const query = InventoryDtoTestFactory.createLowStockQueryDto();
    const mockInventories: IInventory[] =
      InventoryTestFactory.createMultipleInventories(3);
    const useCaseResult = Result.success(mockInventories);

    usecase.execute.mockResolvedValue(useCaseResult);

    // Act
    const result = await controller.handle(query);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(usecase.execute).toHaveBeenCalledWith(query);
    expect(result.value).toEqual(mockInventories);
    expect(result.value.length).toBe(3);
  });

  it('should return a failure if the use case fails', async () => {
    // Arrange
    const query = InventoryDtoTestFactory.createLowStockQueryDto();
    const useCaseError = ErrorFactory.UseCaseError(
      'Failed to fetch from repository',
    );

    usecase.execute.mockResolvedValue(useCaseError);

    // Act
    const result = await controller.handle(query);

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(
      result,
      useCaseError.error,
    );
    expect(usecase.execute).toHaveBeenCalledWith(query);
  });

  it('should return a controller error on unexpected exceptions', async () => {
    // Arrange
    const query = InventoryDtoTestFactory.createLowStockQueryDto();
    const unexpectedError = new Error('Unexpected explosion');

    usecase.execute.mockRejectedValue(unexpectedError);

    // Act
    const result = await controller.handle(query);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      unexpectedError,
    );
    expect(usecase.execute).toHaveBeenCalledWith(query);
  });
});
