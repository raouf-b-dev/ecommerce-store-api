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
import { LowStockQuery } from '../../../core/domain/repositories/inventory.repository';

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
      const entity = InventoryMapper.toEntity(inventory);
      if (expectedVersion !== undefined) {
        entity.version = expectedVersion;
      }
      const savedEntity = await this.ormRepo.save(entity);
      inventory.setId(savedEntity.id);
      return Result.success(inventory);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save inventory', error);
    }
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
