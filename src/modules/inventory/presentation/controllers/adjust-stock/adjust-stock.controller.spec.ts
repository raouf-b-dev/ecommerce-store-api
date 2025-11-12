import { AdjustStockUseCase } from '../../../application/adjust-stock/adjust-stock.usecase';
import { AdjustStockController } from './adjust-stock.controller';

import { Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { InventoryDtoTestFactory } from '../../../testing/factories/inventory-dto.test.factory';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';

describe('AdjustStockController', () => {
  let usecase: jest.Mocked<AdjustStockUseCase>;
  let controller: AdjustStockController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new AdjustStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with inventory when use case succeeds', async () => {
      // Arrange
      const dto = InventoryDtoTestFactory.createAddStockDto();
      const inventory = InventoryTestFactory.createMockInventory();

      usecase.execute.mockResolvedValue(Result.success(inventory));

      // Act
      const result = await controller.handle(inventory.productId, dto);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith({
        productId: inventory.productId,
        dto,
      });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(inventory);
    });

    it('should return the specific failure result when use case fails', async () => {
      // Arrange
      const dto = InventoryDtoTestFactory.createAdjustStockDto();
      const expectedError = new UseCaseError('Product not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle('PR0000001', dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Product not found',
        UseCaseError,
      );
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const dto = InventoryDtoTestFactory.createAdjustStockDto();
      const unexpectedError = new Error('Database connection failed');

      usecase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle('PR0000001', dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        unexpectedError,
      );
    });
  });
});
