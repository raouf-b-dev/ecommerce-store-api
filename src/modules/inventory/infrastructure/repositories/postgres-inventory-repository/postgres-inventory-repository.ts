import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryRepository } from '../../../domain/repositories/inventory.repository';
import { Inventory } from '../../../domain/entities/inventory';
import { InventoryEntity } from '../../orm/inventory.schema';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { InventoryMapper } from '../../persistence/mappers/inventory.mapper';

@Injectable()
export class PostgresInventoryRepository implements InventoryRepository {
  constructor(
    @InjectRepository(InventoryEntity)
    private readonly ormRepo: Repository<InventoryEntity>,
    private readonly dataSource: DataSource,
    private readonly idGeneratorService: IdGeneratorService,
  ) {}

  async findById(id: string): Promise<Result<Inventory, RepositoryError>> {
    try {
      const entity = await this.ormRepo.findOne({
        where: { id },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Inventory not found');
      }

      const inventory = InventoryMapper.toDomain(entity);
      return Result.success<Inventory>(inventory);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find inventory', error);
    }
  }

  async findByProductId(
    productId: string,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const entity = await this.ormRepo.findOne({
        where: { productId },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError(
          `Inventory not found for product ${productId}`,
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
    productIds: string[],
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
    threshold: number = 10,
    page: number = 1,
    limit: number = 20,
  ): Promise<Result<Inventory[], RepositoryError>> {
    try {
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

  async save(
    inventory: Inventory,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const savedInventory = await this.dataSource.transaction(
        async (manager) => {
          // Check if inventory already exists for this product
          const existingEntity = await manager.findOne(InventoryEntity, {
            where: { productId: inventory.productId },
          });

          if (existingEntity) {
            throw new RepositoryError(
              `INVENTORY_EXISTS: Inventory already exists for product ${inventory.productId}`,
            );
          }

          const inventoryId =
            await this.idGeneratorService.generateInventoryId();

          const entity = InventoryMapper.toEntity(inventory);
          entity.id = inventoryId;
          return await manager.save(InventoryEntity, entity);
        },
      );

      const domainInventory = InventoryMapper.toDomain(savedInventory);
      return Result.success<Inventory>(domainInventory);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);

      return ErrorFactory.RepositoryError('Failed to save inventory', error);
    }
  }

  async update(
    inventory: Inventory,
  ): Promise<Result<Inventory, RepositoryError>> {
    try {
      const updatedInventory = await this.dataSource.transaction(
        async (manager) => {
          const existingEntity = await manager.findOne(InventoryEntity, {
            where: { id: inventory.id },
          });

          if (!existingEntity) {
            throw new RepositoryError(
              `INVENTORY_NOT_FOUND: Inventory with ID ${inventory.id} not found`,
            );
          }

          const entity = InventoryMapper.toEntity(inventory);

          await manager.update(
            InventoryEntity,
            { id: entity.id },
            {
              availableQuantity: entity.availableQuantity,
              reservedQuantity: entity.reservedQuantity,
              totalQuantity: entity.totalQuantity,
              lowStockThreshold: entity.lowStockThreshold,
              updatedAt: entity.updatedAt,
              lastRestockDate: entity.lastRestockDate,
            },
          );

          const updatedEntity = await manager.findOne(InventoryEntity, {
            where: { id: entity.id },
          });

          if (!updatedEntity) {
            throw new RepositoryError(
              `INVENTORY_NOT_FOUND: Inventory with ID ${entity.id} not found after update`,
            );
          }

          return updatedEntity;
        },
      );

      const domainInventory = InventoryMapper.toDomain(updatedInventory);
      return Result.success<Inventory>(domainInventory);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to update inventory', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.ormRepo.delete({ id });

      if (deleteResult.affected === 0) {
        return ErrorFactory.RepositoryError('Inventory not found');
      }

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete inventory', error);
    }
  }
}
