import {
  InventoryTestFactory,
  InventoryCommandTestFactory,
  MockInventoryRepository,
} from 'src/modules/inventory/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { AdjustStockUseCase } from './adjust-stock.usecase';
import { InventoryRepository } from '../../../domain/repositories/inventory.repository';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { StockAdjustmentType } from '../../../domain/value-objects/stock-adjustment-type';

describe('AdjustStockUseCase', () => {
  let useCase: AdjustStockUseCase;
  let mockRepository: MockInventoryRepository;

  const mockInventoryData = InventoryTestFactory.createInStockInventory({
    id: 1,
    productId: 1,
    availableQuantity: 100,
    reservedQuantity: 10,
  });

  beforeEach(async () => {
    mockRepository = new MockInventoryRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjustStockUseCase,
        {
          provide: InventoryRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<AdjustStockUseCase>(AdjustStockUseCase);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('Repository Errors', () => {
    it('should handle inventory not found and save failures', async () => {
      mockRepository.mockInventoryNotFoundForProduct(1);
      const command = InventoryCommandTestFactory.createAddStockCommand(50);

      let result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found for product 1',
      );

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSaveFailure('Database connection failed');

      result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database connection failed',
      );
    });
  });

  describe('ADD Type', () => {
    it('should add stock successfully and update lastRestockDate', async () => {
      const command = InventoryCommandTestFactory.createAddStockCommand(50);
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulSave();

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(150);
      expect(result.value.lastRestockDate).not.toBeNull();
    });

    it('should reject negative and zero quantities', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);

      let command = InventoryCommandTestFactory.createAdjustStockCommand({
        productId: 1,
        quantity: -10,
        type: StockAdjustmentType.ADD,
      });
      let result = await useCase.execute(command);
      ResultAssertionHelper.assertResultFailure(
        result,
        'Quantity cannot be negative',
      );

      command = InventoryCommandTestFactory.createZeroQuantityAdjustCommand();
      result = await useCase.execute(command);
      ResultAssertionHelper.assertResultFailure(
        result,
        'Quantity to increase must be positive',
      );
    });
  });

  describe('SUBTRACT Type', () => {
    it('should subtract stock successfully including all available', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulSave();

      let command = InventoryCommandTestFactory.createSubtractStockCommand(30);
      let result = await useCase.execute(command);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(70); // 100 - 30

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulSave();
      command = InventoryCommandTestFactory.createSubtractStockCommand(100);
      result = await useCase.execute(command);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(0);
    });

    it('should reject insufficient stock and invalid quantities', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);

      let command = InventoryCommandTestFactory.createSubtractStockCommand(200);
      let result = await useCase.execute(command);
      ResultAssertionHelper.assertResultFailure(result, 'Insufficient stock');

      command = InventoryCommandTestFactory.createAdjustStockCommand({
        productId: 1,
        quantity: -5,
        type: StockAdjustmentType.SUBTRACT,
      });
      result = await useCase.execute(command);
      ResultAssertionHelper.assertResultFailure(
        result,
        'Quantity cannot be negative',
      );
    });
  });

  describe('SET Type', () => {
    it('should set stock to any valid value including zero', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulSave();

      let command = InventoryCommandTestFactory.createSetStockCommand(250);
      let result = await useCase.execute(command);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(250);

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulSave();
      command = InventoryCommandTestFactory.createSetStockCommand(50);
      result = await useCase.execute(command);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(50);

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulSave();
      command = InventoryCommandTestFactory.createSetStockCommand(0);
      result = await useCase.execute(command);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(0);
    });

    it('should reject negative values', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      const command = InventoryCommandTestFactory.createAdjustStockCommand({
        productId: 1,
        quantity: -50,
        type: StockAdjustmentType.SET,
      });

      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultFailure(result);
    });
  });

  describe('Business Rules', () => {
    it('should preserve reserved quantity during adjustments', async () => {
      const inventoryWithReservations =
        InventoryTestFactory.createInventoryWithReservations({
          productId: 1,
          reservedQuantity: 20,
        });
      mockRepository.mockSuccessfulFindByProductId(inventoryWithReservations);
      mockRepository.mockSuccessfulSave();

      const command = InventoryCommandTestFactory.createAddStockCommand(50);
      const result = await useCase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.reservedQuantity).toBe(20);
    });
  });
});
