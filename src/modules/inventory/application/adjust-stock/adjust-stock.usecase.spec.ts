import { Test, TestingModule } from '@nestjs/testing';
import { AdjustStockUseCase } from './adjust-stock.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { InventoryTestFactory } from '../../testing/factories/inventory.test.factory';
import { InventoryDtoTestFactory } from '../../testing/factories/inventory-dto.test.factory';
import { ResultAssertionHelper } from '../../../../testing/helpers/result-assertion.helper';
import { MockInventoryRepository } from '../../testing/mocks/inventory-repository.mock';
import { StockAdjustmentType } from '../../presentation/dto/adjust-stock.dto';
import { Inventory } from '../../domain/entities/inventory';

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
    it('should handle inventory not found and update failures', async () => {
      mockRepository.mockInventoryNotFoundForProduct(1);
      const dto = InventoryDtoTestFactory.createAddStockDto(50);

      let result = await useCase.execute({ productId: 1, dto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found for product 1',
      );
      mockRepository.verifyFindByProductIdCalledWith(1);

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockUpdateFailure('Database connection failed');

      result = await useCase.execute({ productId: 1, dto });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Database connection failed',
      );
    });

    it('should handle invalid adjustment type and unexpected errors', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      const invalidDto = {
        quantity: 10,
        type: 'INVALID' as any,
        reason: 'Test',
      };

      let result = await useCase.execute({
        productId: 1,
        dto: invalidDto,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Invalid stock adjustment type',
      );

      mockRepository.reset();
      mockRepository.findByProductId.mockRejectedValue(new Error('Unexpected'));

      result = await useCase.execute({
        productId: 1,
        dto: InventoryDtoTestFactory.createAddStockDto(10),
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected UseCase Error',
      );
    });
  });

  describe('ADD Type', () => {
    it('should add stock successfully and update lastRestockDate', async () => {
      const dto = InventoryDtoTestFactory.createAddStockDto(50);
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      const inventory = Inventory.fromPrimitives(mockInventoryData);
      mockRepository.mockSuccessfulUpdate(inventory);

      const result = await useCase.execute({ productId: 1, dto });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(150);
      expect(result.value.lastRestockDate).not.toBeNull();
      mockRepository.verifyFindByProductIdCalledWith(1);
    });

    it('should reject negative and zero quantities', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);

      let dto = InventoryDtoTestFactory.createAdjustStockDto({
        quantity: -10,
        type: StockAdjustmentType.ADD,
      });
      let result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultFailure(
        result,
        'Quantity cannot be negative',
      );

      dto = InventoryDtoTestFactory.createZeroQuantityAdjustDto();
      result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultFailure(
        result,
        'Quantity to increase must be positive',
      );
    });
  });

  describe('SUBTRACT Type', () => {
    it('should subtract stock successfully including all available', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      const inventory = Inventory.fromPrimitives(mockInventoryData);
      mockRepository.mockSuccessfulUpdate(inventory);

      let dto = InventoryDtoTestFactory.createSubtractStockDto(30);
      let result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(70); // 100 - 30

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulUpdate(inventory);
      dto = InventoryDtoTestFactory.createSubtractStockDto(100);
      result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(0);
    });

    it('should reject insufficient stock and invalid quantities', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);

      let dto = InventoryDtoTestFactory.createSubtractStockDto(200);
      let result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultFailure(result, 'Insufficient stock');

      dto = InventoryDtoTestFactory.createAdjustStockDto({
        quantity: -5,
        type: StockAdjustmentType.SUBTRACT,
      });
      result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultFailure(
        result,
        'Quantity cannot be negative',
      );
    });
  });

  describe('SET Type', () => {
    it('should set stock to any valid value including zero', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      const inventory = Inventory.fromPrimitives(mockInventoryData);
      mockRepository.mockSuccessfulUpdate(inventory);

      let dto = InventoryDtoTestFactory.createSetStockDto(250);
      let result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(250);

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulUpdate(inventory);
      dto = InventoryDtoTestFactory.createSetStockDto(50);
      result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(50);

      mockRepository.reset();
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      mockRepository.mockSuccessfulUpdate(inventory);
      dto = InventoryDtoTestFactory.createSetStockDto(0);
      result = await useCase.execute({ productId: 1, dto });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.availableQuantity).toBe(0);
    });

    it('should reject negative values', async () => {
      mockRepository.mockSuccessfulFindByProductId(mockInventoryData);
      const dto = InventoryDtoTestFactory.createAdjustStockDto({
        quantity: -50,
        type: StockAdjustmentType.SET,
      });

      const result = await useCase.execute({ productId: 1, dto });

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
      const inventory = Inventory.fromPrimitives(inventoryWithReservations);
      mockRepository.mockSuccessfulUpdate(inventory);

      const dto = InventoryDtoTestFactory.createAddStockDto(50);
      const result = await useCase.execute({ productId: 1, dto });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.reservedQuantity).toBe(20);
    });
  });
});
