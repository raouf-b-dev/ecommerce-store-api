// src/modules/inventory/testing/mocks/inventory-repository.mock.ts
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Inventory } from '../../domain/entities/inventory';
import { IInventory } from '../../domain/interfaces/inventory.interface';
import { LowStockQueryDto } from '../../presentation/dto/low-stock-query.dto';

export class MockInventoryRepository implements InventoryRepository {
  findById = jest.fn<Promise<Result<Inventory, RepositoryError>>, [string]>();

  findByProductId = jest.fn<
    Promise<Result<Inventory, RepositoryError>>,
    [string]
  >();

  findByProductIds = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [string[]]
  >();

  findLowStock = jest.fn<
    Promise<Result<Inventory[], RepositoryError>>,
    [LowStockQueryDto]
  >();

  save = jest.fn<Promise<Result<Inventory, RepositoryError>>, [Inventory]>();

  update = jest.fn<Promise<Result<Inventory, RepositoryError>>, [Inventory]>();

  delete = jest.fn<Promise<Result<void, RepositoryError>>, [string]>();

  mockSuccessfulFindById(inventoryPrimitives: IInventory): void {
    const domainInventory = Inventory.fromPrimitives(inventoryPrimitives);
    this.findById.mockResolvedValue(Result.success(domainInventory));
  }

  mockInventoryNotFound(id: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(`Inventory with id ${id} not found`)),
    );
  }

  mockSuccessfulFindByProductId(inventoryPrimitives: IInventory): void {
    const domainInventory = Inventory.fromPrimitives(inventoryPrimitives);
    this.findByProductId.mockResolvedValue(Result.success(domainInventory));
  }

  mockInventoryNotFoundForProduct(productId: string): void {
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

  mockInventoryAlreadyExists(productId: string): void {
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

  mockInventoryNotFoundForUpdate(id: string): void {
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

  mockInventoryNotFoundForDelete(id: string): void {
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

  verifyFindByIdCalledWith(id: string): void {
    expect(this.findById).toHaveBeenCalledWith(id);
  }

  verifyFindByProductIdCalledWith(productId: string): void {
    expect(this.findByProductId).toHaveBeenCalledWith(productId);
  }

  verifyUpdateCalledWith(inventory: Inventory): void {
    expect(this.update).toHaveBeenCalledWith(inventory);
  }

  verifyDeleteCalledWith(id: string): void {
    expect(this.delete).toHaveBeenCalledWith(id);
  }
}
