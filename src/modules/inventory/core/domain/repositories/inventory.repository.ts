import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Inventory } from '../entities/inventory';

export type InventorySortField =
  'id' | 'productId' | 'availableQuantity' | 'reservedQuantity' | 'createdAt';

export interface InventorySearchQuery {
  page?: number;
  limit?: number;
  sortBy?: InventorySortField;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Keyset batch traversal contract.
 * Always traverses deterministically by primary key (ORDER BY id ASC).
 * Omitting `afterId` (undefined) starts the traversal from the beginning.
 */
export interface InventoryBatchQuery {
  afterId?: number;
  limit?: number;
}

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

  abstract findMany(
    query?: InventorySearchQuery,
  ): Promise<Result<Inventory[], RepositoryError>>;

  abstract findBatch(
    query?: InventoryBatchQuery,
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
