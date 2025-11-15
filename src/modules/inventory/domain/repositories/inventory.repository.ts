// src/modules/inventory/domain/repositories/inventory.repository.ts
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { LowStockQueryDto } from '../../presentation/dto/low-stock-query.dto';
import { Inventory } from '../entities/inventory';

export abstract class InventoryRepository {
  abstract findById(id: string): Promise<Result<Inventory, RepositoryError>>;

  abstract findByProductId(
    productId: string,
  ): Promise<Result<Inventory, RepositoryError>>;

  abstract findByProductIds(
    productIds: string[],
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

  abstract delete(id: string): Promise<Result<void, RepositoryError>>;
}
