import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { AdjustStockController } from './presentation/controllers/adjust-stock/adjust-stock.controller';
import { BulkCheckStockController } from './presentation/controllers/bulk-check-stock/bulk-check-stock.controller';
import { CheckStockController } from './presentation/controllers/check-stock/check-stock.controller';
import { GetInventoryController } from './presentation/controllers/get-inventory/get-inventory.controller';
import { ListLowStockController } from './presentation/controllers/list-low-stock/list-low-stock.controller';
import { ReleaseStockController } from './presentation/controllers/release-stock/release-stock.controller';
import { ReserveStockController } from './presentation/controllers/reserve-stock/reserve-stock.controller';
import { IInventory } from './domain/interfaces/inventory.interface';
import { InventoryTestFactory } from './testing/factories/inventory.test.factory';

describe('InventoryController', () => {
  let controller: InventoryController;

  let getInventoryController: GetInventoryController;
  let adjustStockController: AdjustStockController;
  let reserveStockController: ReserveStockController;
  let releaseStockController: ReleaseStockController;
  let checkStockController: CheckStockController;
  let listLowStockController: ListLowStockController;
  let bulkCheckStockController: BulkCheckStockController;

  let mockInventory: IInventory;

  beforeEach(async () => {
    mockInventory = InventoryTestFactory.createMockInventory();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: GetInventoryController,
          useValue: {
            handle: jest.fn().mockResolvedValue(mockInventory),
          },
        },
        {
          provide: AdjustStockController,
          useValue: {
            handle: jest.fn().mockResolvedValue(mockInventory),
          },
        },
        {
          provide: ReserveStockController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ReleaseStockController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CheckStockController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ListLowStockController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: BulkCheckStockController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);

    getInventoryController = module.get<GetInventoryController>(
      GetInventoryController,
    );
    adjustStockController = module.get<AdjustStockController>(
      AdjustStockController,
    );
    reserveStockController = module.get<ReserveStockController>(
      ReserveStockController,
    );
    releaseStockController = module.get<ReleaseStockController>(
      ReleaseStockController,
    );
    checkStockController =
      module.get<CheckStockController>(CheckStockController);
    listLowStockController = module.get<ListLowStockController>(
      ListLowStockController,
    );
    bulkCheckStockController = module.get<BulkCheckStockController>(
      BulkCheckStockController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
