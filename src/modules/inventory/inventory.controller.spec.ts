import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { IInventory } from './domain/interfaces/inventory.interface';
import { InventoryTestFactory } from './testing/factories/inventory.test.factory';
import { Result } from '../../core/domain/result';

import { AdjustStockUseCase } from './application/adjust-stock/adjust-stock.usecase';
import { BulkCheckStockUseCase } from './application/bulk-check-stock/bulk-check-stock.usecase';
import { CheckStockUseCase } from './application/check-stock/check-stock.usecase';
import { GetInventoryUseCase } from './application/get-inventory/get-inventory.usecase';
import { ListLowStockUseCase } from './application/list-low-stock/list-low-stock.usecase';
import { ReleaseStockUseCase } from './application/release-stock/release-stock.usecase';
import { ReserveStockUseCase } from './application/reserve-stock/reserve-stock.usecase';

describe('InventoryController', () => {
  let controller: InventoryController;

  let getInventoryUseCase: GetInventoryUseCase;
  let adjustStockUseCase: AdjustStockUseCase;
  let reserveStockUseCase: ReserveStockUseCase;
  let releaseStockUseCase: ReleaseStockUseCase;
  let checkStockUseCase: CheckStockUseCase;
  let listLowStockUseCase: ListLowStockUseCase;
  let bulkCheckStockUseCase: BulkCheckStockUseCase;

  let mockInventory: IInventory;
  let mockLowStockInventory: IInventory;

  beforeEach(async () => {
    mockInventory = InventoryTestFactory.createMockInventory();
    mockLowStockInventory = InventoryTestFactory.createInStockInventory();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: GetInventoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(mockInventory)),
          },
        },
        {
          provide: AdjustStockUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(mockInventory)),
          },
        },
        {
          provide: ReserveStockUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ReleaseStockUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: CheckStockUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ListLowStockUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue(Result.success([mockLowStockInventory])),
          },
        },
        {
          provide: BulkCheckStockUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);

    getInventoryUseCase = module.get<GetInventoryUseCase>(GetInventoryUseCase);
    adjustStockUseCase = module.get<AdjustStockUseCase>(AdjustStockUseCase);
    reserveStockUseCase = module.get<ReserveStockUseCase>(ReserveStockUseCase);
    releaseStockUseCase = module.get<ReleaseStockUseCase>(ReleaseStockUseCase);
    checkStockUseCase = module.get<CheckStockUseCase>(CheckStockUseCase);
    listLowStockUseCase = module.get<ListLowStockUseCase>(ListLowStockUseCase);
    bulkCheckStockUseCase = module.get<BulkCheckStockUseCase>(
      BulkCheckStockUseCase,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
