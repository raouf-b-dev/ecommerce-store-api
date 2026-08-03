// src/modules/inventory/domain/repositories/inventory.repository.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Inventory } from '../entities/inventory';

export interface LowStockQuery {
  threshold?: number;
  page?: number;
  limit?: number;
}

export abstract class InventoryRepository {
  abstract findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
  >;

  abstract findByProductIdForUpdate(
    productId: number,
  ): Promise<
    Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
  >;

  abstract findById(id: number): Promise<Result<Inventory, RepositoryError>>;

  abstract findByProductId(
    productId: number,
  ): Promise<Result<Inventory, RepositoryError>>;

  abstract findByProductIds(
    productIds: number[],
  ): Promise<Result<Inventory[], RepositoryError>>;

  abstract findLowStock(
    query: LowStockQuery,
  ): Promise<Result<Inventory[], RepositoryError>>;

  abstract save(
    inventory: Inventory,
    expectedVersion?: number,
  ): Promise<Result<Inventory, RepositoryError>>;

  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
