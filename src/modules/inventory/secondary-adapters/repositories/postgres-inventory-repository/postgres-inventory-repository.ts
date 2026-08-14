import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryRepository } from '../../../core/domain/repositories/inventory.repository';
import { Inventory } from '../../../core/domain/entities/inventory';
import { InventoryEntity } from '../../orm/inventory.schema';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { InventoryMapper } from '../../persistence/mappers/inventory.mapper';
import {
  LowStockQuery,
  InventorySearchQuery,
  InventoryBatchQuery,
} from '../../../core/domain/repositories/inventory.repository';

@Injectable()
export class PostgresInventoryRepository implements InventoryRepository {
  constructor(
    @InjectRepository(InventoryEntity)
    private readonly ormRepo: Repository<InventoryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<Result<Inventory, RepositoryError>> {
    try {
      const entity = await this.ormRepo.findOne({
        where: { id },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError(
          'Inventory not found',
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }

      const inventory = InventoryMapper.toDomain(entity);
      return Result.success<Inventory>(inventory);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find inventory', error);
    }
  }

  async findByProductId(
    productId: number,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const entity = await this.ormRepo.findOne({
        where: { productId },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError(
          `Inventory not found for product ${productId}`,
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }

      const inventory = InventoryMapper.toDomain(entity);
      return Result.success<Inventory>(inventory);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find inventory by product ID',
        error,
      );
    }
  }

  async findByProductIds(
    productIds: number[],
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      if (productIds.length === 0) {
        return Result.success<Inventory[]>([]);
      }

      const entities = await this.ormRepo
        .createQueryBuilder('inventory')
        .where('inventory.productId IN (:...productIds)', { productIds })
        .getMany();

      const inventories = InventoryMapper.toDomainArray(entities);
      return Result.success<Inventory[]>(inventories);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find inventories by product IDs',
        error,
      );
    }
  }

  async findMany(
    query?: InventorySearchQuery,
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      const {
        page = 1,
        limit = 100,
        sortBy = 'id',
        sortOrder = 'ASC',
      } = query || {};
      const skip = (page - 1) * limit;

      const entities = await this.ormRepo.find({
        skip,
        take: limit,
        order: { [sortBy]: sortOrder },
      });

      return Result.success<Inventory[]>(
        InventoryMapper.toDomainArray(entities),
      );
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find inventories', error);
    }
  }

  async findBatch(
    query?: InventoryBatchQuery,
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      const { afterId, limit = 100 } = query || {};
      const qb = this.ormRepo
        .createQueryBuilder('inventory')
        .orderBy('inventory.id', 'ASC')
        .take(limit);

      if (afterId !== undefined) {
        qb.where('inventory.id > :afterId', { afterId });
      }

      const entities = await qb.getMany();
      return Result.success<Inventory[]>(
        InventoryMapper.toDomainArray(entities),
      );
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to batch find inventories',
        error,
      );
    }
  }

  async findLowStock(
    query: LowStockQuery,
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
      const { threshold = 10, page = 1, limit = 20 } = query;

      const skip = (page - 1) * limit;

      const entities = await this.ormRepo
        .createQueryBuilder('inventory')
        .where('inventory.availableQuantity > 0')
        .andWhere('inventory.availableQuantity <= :threshold', { threshold })
        .orderBy('inventory.availableQuantity', 'ASC')
        .skip(skip)
        .take(limit)
        .getMany();

      const inventories = InventoryMapper.toDomainArray(entities);
      return Result.success<Inventory[]>(inventories);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find low stock inventories',
        error,
      );
    }
  }

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
  > {
    try {
      const entity = await this.ormRepo.findOne({ where: { id } });
      if (!entity) {
        return ErrorFactory.RepositoryError(
          'Inventory not found',
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }
      return Result.success({
        entity: InventoryMapper.toDomain(entity),
        expectedVersion: entity.version,
      });
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find inventory for update',
        error,
      );
    }
  }

  async findByProductIdForUpdate(
    productId: number,
  ): Promise<
    Result<{ entity: Inventory; expectedVersion: number }, RepositoryError>
  > {
    try {
      const entity = await this.ormRepo.findOne({ where: { productId } });
      if (!entity) {
        return ErrorFactory.RepositoryError(
          `Inventory not found for product ${productId}`,
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }
      return Result.success({
        entity: InventoryMapper.toDomain(entity),
        expectedVersion: entity.version,
      });
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find inventory by product ID for update',
        error,
      );
    }
  }

  async save(
    inventory: Inventory,
    expectedVersion?: number,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      if (expectedVersion !== undefined) {
        return await this.updateWithOptimisticLock(inventory, expectedVersion);
      }
      return await this.saveNormally(inventory);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save inventory', error);
    }
  }

  private async updateWithOptimisticLock(
    inventory: Inventory,
    expectedVersion: number,
  ): Promise<Result<Inventory, RepositoryError>> {
    const entity = InventoryMapper.toEntity(inventory);
    const updateResult = await this.ormRepo
      .createQueryBuilder()
      .update(InventoryEntity)
      .set({
        availableQuantity: entity.availableQuantity,
        reservedQuantity: entity.reservedQuantity,
        lowStockThreshold: entity.lowStockThreshold,
        lastRestockDate: entity.lastRestockDate,
        version: () => 'version + 1',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND version = :expectedVersion', {
        id: inventory.id,
        expectedVersion,
      })
      .execute();

    if (updateResult.affected === 0) {
      return ErrorFactory.RepositoryError(
        `Optimistic lock failure for Inventory ${inventory.id}. Expected version ${expectedVersion}.`,
        undefined,
        HttpStatus.CONFLICT,
      );
    }

    const updatedEntity = await this.ormRepo.findOneByOrFail({
      id: inventory.id!,
    });
    return Result.success(InventoryMapper.toDomain(updatedEntity));
  }

  private async saveNormally(
    inventory: Inventory,
  ): Promise<Result<Inventory, RepositoryError>> {
    const entity = InventoryMapper.toEntity(inventory);
    const savedEntity = await this.ormRepo.save(entity);
    return Result.success(InventoryMapper.toDomain(savedEntity));
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.ormRepo.delete({ id });

      if (deleteResult.affected === 0) {
        return ErrorFactory.RepositoryError(
          'Inventory not found',
          undefined,
          HttpStatus.NOT_FOUND,
        );
      }

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete inventory', error);
    }
  }
}
