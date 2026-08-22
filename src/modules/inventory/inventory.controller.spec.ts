import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { IInventory } from './core/domain/interfaces/inventory.interface';
import { InventoryTestFactory } from './testing/factories/inventory.test.factory';
import { Result } from '../../shared-kernel/domain/result';
import { AdjustStockUseCase } from './core/application/usecases/adjust-stock/adjust-stock.usecase';
import { BulkCheckStockUseCase } from './core/application/usecases/bulk-check-stock/bulk-check-stock.usecase';
import { CheckStockUseCase } from './core/application/usecases/check-stock/check-stock.usecase';
import { GetInventoryUseCase } from './core/application/usecases/get-inventory/get-inventory.usecase';
import { ListLowStockUseCase } from './core/application/usecases/list-low-stock/list-low-stock.usecase';
import { ReleaseStockUseCase } from './core/application/usecases/release-stock/release-stock.usecase';
import { ReserveStockUseCase } from './core/application/usecases/reserve-stock/reserve-stock.usecase';
import { ListInventoryUseCase } from './core/application/usecases/list-inventory/list-inventory.usecase';
import { ListInventoryQueryDto } from './primary-adapters/dto/list-inventory-query.dto';
import { LowStockQueryDto } from './primary-adapters/dto/low-stock-query.dto';
import { StockAdjustmentType } from './core/domain/value-objects/stock-adjustment-type';

describe('InventoryController', () => {
  let controller: InventoryController;
  let getInventoryUseCase: jest.Mocked<GetInventoryUseCase>;
  let listInventoryUseCase: jest.Mocked<ListInventoryUseCase>;
  let adjustStockUseCase: jest.Mocked<AdjustStockUseCase>;
  let reserveStockUseCase: jest.Mocked<ReserveStockUseCase>;
  let releaseStockUseCase: jest.Mocked<ReleaseStockUseCase>;
  let checkStockUseCase: jest.Mocked<CheckStockUseCase>;
  let listLowStockUseCase: jest.Mocked<ListLowStockUseCase>;
  let bulkCheckStockUseCase: jest.Mocked<BulkCheckStockUseCase>;

  let mockInventory: IInventory;

  beforeEach(async () => {
    mockInventory = InventoryTestFactory.createMockInventory();

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
          provide: ListInventoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(
              Result.success({
                items: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
              }),
            ),
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
            execute: jest.fn().mockResolvedValue(Result.success([])),
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
    getInventoryUseCase = module.get(GetInventoryUseCase);
    listInventoryUseCase = module.get(ListInventoryUseCase);
    adjustStockUseCase = module.get(AdjustStockUseCase);
    reserveStockUseCase = module.get(ReserveStockUseCase);
    releaseStockUseCase = module.get(ReleaseStockUseCase);
    checkStockUseCase = module.get(CheckStockUseCase);
    listLowStockUseCase = module.get(ListLowStockUseCase);
    bulkCheckStockUseCase = module.get(BulkCheckStockUseCase);
  });

  it('should delegate getInventory to GetInventoryUseCase', async () => {
    await controller.getInventory(42);
    expect(getInventoryUseCase.execute).toHaveBeenCalledWith(42);
  });

  it('should delegate findAll to ListInventoryUseCase', async () => {
    const query = new ListInventoryQueryDto();
    await controller.findAll(query);
    expect(listInventoryUseCase.execute).toHaveBeenCalledWith(query);
  });

  it('should delegate adjustStock to AdjustStockUseCase', async () => {
    const dto = {
      quantity: 5,
      type: StockAdjustmentType.ADD,
      reason: 'restock',
    };
    await controller.adjustStock(42, dto);
    expect(adjustStockUseCase.execute).toHaveBeenCalledWith({
      productId: 42,
      ...dto,
    });
  });

  it('should delegate reserveStock to ReserveStockUseCase', async () => {
    const dto = { orderId: 10, items: [{ productId: 1, quantity: 2 }] };
    await controller.reserveStock(dto);
    expect(reserveStockUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should delegate checkStock to CheckStockUseCase', async () => {
    await controller.checkStock(42, 3);
    expect(checkStockUseCase.execute).toHaveBeenCalledWith({
      productId: 42,
      quantity: 3,
    });
  });

  it('should delegate releaseStock to ReleaseStockUseCase', async () => {
    await controller.releaseStock(99);
    expect(releaseStockUseCase.execute).toHaveBeenCalledWith(99);
  });

  it('should delegate listLowStock to ListLowStockUseCase', async () => {
    const query = new LowStockQueryDto();
    await controller.listLowStock(query);
    expect(listLowStockUseCase.execute).toHaveBeenCalledWith(query);
  });

  it('should delegate bulkCheckStock to BulkCheckStockUseCase', async () => {
    const dto = [{ productId: 1, quantity: 2 }];
    await controller.bulkCheckStock(dto);
    expect(bulkCheckStockUseCase.execute).toHaveBeenCalledWith(dto);
  });
});
