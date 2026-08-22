// src/modules/inventory/testing/mocks/inventory-repository.mock.ts
import {
  InventoryRepository,
  LowStockQuery,
} from '../../core/domain/repositories/inventory.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Inventory } from '../../core/domain/entities/inventory';
import { IInventory } from '../../core/domain/interfaces/inventory.interface';

export class MockInventoryRepository implements InventoryRepository {
  findByIdForUpdate = jest.fn<
    Promise<
      Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
    >,
    [number]
  >();

  findByProductIdForUpdate = jest.fn<
    Promise<
      Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
    >,
    [number]
  >();

  findById = jest.fn<Promise<Result<Inventory, RepositoryError>>, [number]>();

  findByProductId = jest.fn<
    Promise<Result<Inventory, RepositoryError>>,
    [number]
  >();

  findByProductIds = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [number[]]
  >();

  findMany = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [
      import('../../core/domain/repositories/inventory.repository').InventorySearchQuery?,
    ]
  >();

  findBatch = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [
      import('../../core/domain/repositories/inventory.repository').InventoryBatchQuery?,
    ]
  >();

  findLowStock = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [LowStockQuery]
  >();

  save = jest.fn<
    Promise<Result<Inventory, RepositoryError>>,
    [Inventory, number?]
  >();

  delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  mockSuccessfulFindById(inventoryPrimitives: IInventory): void {
    const domainInventory = Inventory.fromPrimitives(inventoryPrimitives);
    this.findById.mockResolvedValue(Result.success(domainInventory));
    this.findByIdForUpdate.mockResolvedValue(
      Result.success({ entity: domainInventory, expectedVersion: 1 }),
    );
  }

  mockInventoryNotFound(id: number): void {
    const err = Result.failure<RepositoryError>(
      new RepositoryError(`Inventory with id ${id} not found`),
    );
    this.findById.mockResolvedValue(err);
    this.findByIdForUpdate.mockResolvedValue(err);
  }

  mockSuccessfulFindByProductId(inventoryPrimitives: IInventory): void {
    const domainInventory = Inventory.fromPrimitives(inventoryPrimitives);
    this.findByProductId.mockResolvedValue(Result.success(domainInventory));
    this.findByProductIdForUpdate.mockResolvedValue(
      Result.success({ entity: domainInventory, expectedVersion: 1 }),
    );
  }

  mockInventoryNotFoundForProduct(productId: number): void {
    const err = Result.failure<RepositoryError>(
      new RepositoryError(`Inventory not found for product ${productId}`),
    );
    this.findByProductId.mockResolvedValue(err);
    this.findByProductIdForUpdate.mockResolvedValue(err);
  }

  mockSuccessfulFindByProductIds(inventories: IInventory[]): void {
    const domainInventories = inventories.map((inv) =>
      Inventory.fromPrimitives(inv),
    );
    this.findByProductIds.mockResolvedValue(Result.success(domainInventories));
  }

  mockEmptyFindByProductIds(): void {
    this.findByProductIds.mockResolvedValue(Result.success([]));
  }

  mockSuccessfulFindLowStock(inventories: IInventory[]): void {
    const domainInventories = inventories.map((inv) =>
      Inventory.fromPrimitives(inv),
    );
    this.findLowStock.mockResolvedValue(Result.success(domainInventories));
  }

  mockEmptyLowStock(): void {
    this.findLowStock.mockResolvedValue(Result.success([]));
  }

  mockSuccessfulSave(inventory?: Inventory): void {
    if (inventory) {
      this.save.mockResolvedValue(Result.success(inventory));
    } else {
      this.save.mockImplementation((i: Inventory) =>
        Promise.resolve(Result.success(i)),
      );
    }
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockInventoryAlreadyExists(productId: number): void {
    this.save.mockResolvedValue(
      Result.failure(
        new RepositoryError(
          `INVENTORY_EXISTS: Inventory already exists for product ${productId}`,
        ),
      ),
    );
  }

  mockSuccessfulDelete(): void {
    this.delete.mockResolvedValue(Result.success(undefined));
  }

  mockDeleteFailure(errorMessage: string): void {
    this.delete.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockInventoryNotFoundForDelete(id: number): void {
    this.delete.mockResolvedValue(
      Result.failure(new RepositoryError(`Inventory with id ${id} not found`)),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByProductId).not.toHaveBeenCalled();
    expect(this.findByProductIds).not.toHaveBeenCalled();
    expect(this.findLowStock).not.toHaveBeenCalled();
    expect(this.save).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
  }

  verifyFindByIdCalledWith(id: number): void {
    expect(this.findById).toHaveBeenCalledWith(id);
  }

  verifyFindByProductIdCalledWith(productId: number): void {
    expect(this.findByProductId).toHaveBeenCalledWith(productId);
  }

  verifyDeleteCalledWith(id: number): void {
    expect(this.delete).toHaveBeenCalledWith(id);
  }
}
