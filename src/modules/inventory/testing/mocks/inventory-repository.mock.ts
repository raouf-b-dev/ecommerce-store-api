// src/modules/inventory/testing/mocks/inventory-repository.mock.ts
import { InventoryRepository } from '../../core/domain/repositories/inventory.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Inventory } from '../../core/domain/entities/inventory';
import { IInventory } from '../../core/domain/interfaces/inventory.interface';
import { LowStockQueryDto } from '../../primary-adapters/dto/low-stock-query.dto';

export class MockInventoryRepository implements InventoryRepository {
  findById = jest.fn<Promise<Result<Inventory, RepositoryError>>, [number]>();

  findByProductId = jest.fn<
    Promise<Result<Inventory, RepositoryError>>,
    [number]
  >();

  findByProductIds = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [number[]]
  >();

  findLowStock = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [LowStockQueryDto]
  >();

  save = jest.fn<Promise<Result<Inventory, RepositoryError>>, [Inventory]>();

  update = jest.fn<Promise<Result<Inventory, RepositoryError>>, [Inventory]>();

  delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  mockSuccessfulFindById(inventoryPrimitives: IInventory): void {
    const domainInventory = Inventory.fromPrimitives(inventoryPrimitives);
    this.findById.mockResolvedValue(Result.success(domainInventory));
  }

  mockInventoryNotFound(id: number): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(`Inventory with id ${id} not found`)),
    );
  }

  mockSuccessfulFindByProductId(inventoryPrimitives: IInventory): void {
    const domainInventory = Inventory.fromPrimitives(inventoryPrimitives);
    this.findByProductId.mockResolvedValue(Result.success(domainInventory));
  }

  mockInventoryNotFoundForProduct(productId: number): void {
    this.findByProductId.mockResolvedValue(
      Result.failure(
        new RepositoryError(`Inventory not found for product ${productId}`),
      ),
    );
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

  mockSuccessfulSave(inventory: Inventory): void {
    this.save.mockResolvedValue(Result.success(inventory));
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

  mockSuccessfulUpdate(inventory: Inventory): void {
    this.update.mockResolvedValue(Result.success(inventory));
  }

  mockUpdateFailure(errorMessage: string): void {
    this.update.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockInventoryNotFoundForUpdate(id: number): void {
    this.update.mockResolvedValue(
      Result.failure(
        new RepositoryError(
          `INVENTORY_NOT_FOUND: Inventory with ID ${id} not found`,
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
    expect(this.update).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
  }

  verifyFindByIdCalledWith(id: number): void {
    expect(this.findById).toHaveBeenCalledWith(id);
  }

  verifyFindByProductIdCalledWith(productId: number): void {
    expect(this.findByProductId).toHaveBeenCalledWith(productId);
  }

  verifyUpdateCalledWith(inventory: Inventory): void {
    expect(this.update).toHaveBeenCalledWith(inventory);
  }

  verifyDeleteCalledWith(id: number): void {
    expect(this.delete).toHaveBeenCalledWith(id);
  }
}
