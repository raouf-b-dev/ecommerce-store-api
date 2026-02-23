// src/modules/inventory/domain/repositories/inventory.repository.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/errors/repository.error';
import { LowStockQueryDto } from '../../../primary-adapters/dto/low-stock-query.dto';
import { Inventory } from '../entities/inventory';

export abstract class InventoryRepository {
  abstract findById(id: number): Promise<Result<Inventory, RepositoryError>>;

  abstract findByProductId(
    productId: number,
  ): Promise<Result<Inventory, RepositoryError>>;

  abstract findByProductIds(
    productIds: number[],
  ): Promise<Result<Inventory[], RepositoryError>>;

  abstract findLowStock(
    query: LowStockQueryDto,
  ): Promise<Result<Inventory[], RepositoryError>>;

  abstract save(
    inventory: Inventory,
  ): Promise<Result<Inventory, RepositoryError>>;

  abstract update(
    inventory: Inventory,
  ): Promise<Result<Inventory, RepositoryError>>;

  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
