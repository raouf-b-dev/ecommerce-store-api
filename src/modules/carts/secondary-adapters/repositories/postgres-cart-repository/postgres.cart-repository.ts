// src/modules/carts/infrastructure/repositories/postgres-cart-repository/postgres.cart-repository.ts
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Cart } from '../../../core/domain/entities/cart';
import { CartRepository } from '../../../core/domain/repositories/cart.repository';
import { CartEntity } from '../../orm/cart.schema';
import { CartItemEntity } from '../../orm/cart-item.schema';
import { CartMapper } from '../../persistence/mappers/cart.mapper';

@Injectable()
export class PostgresCartRepository implements CartRepository {
  constructor(
    @InjectRepository(CartEntity)
    private readonly repository: Repository<CartEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Cart not found');
      }

      return Result.success(CartMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find cart', error);
    }
  }

  async findByuserId(userId: number): Promise<Result<Cart, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { userId: userId },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Cart not found');
      }

      return Result.success(CartMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by user ID',
        error,
      );
    }
  }

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Cart; expectedVersion: number }, RepositoryError>
  > {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      if (!entity) return ErrorFactory.RepositoryError('Cart not found');
      return Result.success({
        entity: CartMapper.toDomain(entity),
        expectedVersion: entity.version,
      });
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart for update',
        error,
      );
    }
  }

  async findByUserIdForUpdate(
    userId: number,
  ): Promise<
    Result<{ entity: Cart; expectedVersion: number }, RepositoryError>
  > {
    try {
      const entity = await this.repository.findOne({ where: { userId } });
      if (!entity) return ErrorFactory.RepositoryError('Cart not found');
      return Result.success({
        entity: CartMapper.toDomain(entity),
        expectedVersion: entity.version,
      });
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find cart by user ID for update',
        error,
      );
    }
  }

  async save(
    cart: Cart,
    expectedVersion?: number,
  ): Promise<Result<Cart, RepositoryError>> {
    try {
      if (expectedVersion !== undefined) {
        return await this.updateWithOptimisticLock(cart, expectedVersion);
      }
      return await this.saveNormally(cart);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save cart', error);
    }
  }

  private async saveNormally(
    cart: Cart,
  ): Promise<Result<Cart, RepositoryError>> {
    const entity = CartMapper.toEntity(cart);
    const savedEntity = await this.repository.save(entity);
    cart.setId(savedEntity.id);
    return Result.success(cart);
  }

  private async updateWithOptimisticLock(
    cart: Cart,
    expectedVersion: number,
  ): Promise<Result<Cart, RepositoryError>> {
    const mapped = CartMapper.toEntity(cart);
    await this.dataSource.transaction(async (manager) => {
      const updateResult = await manager
        .createQueryBuilder()
        .update(CartEntity)
        .set({
          ...CartMapper.toUpdatePayload(cart),
          version: () => 'version + 1',
          updatedAt: () => 'CURRENT_TIMESTAMP',
        })
        .where('id = :id AND version = :expectedVersion', {
          id: cart.id,
          expectedVersion,
        })
        .execute();

      if (updateResult.affected === 0) {
        const existing = await manager.findOne(CartEntity, {
          where: { id: cart.id! },
        });
        if (!existing) {
          throw new RepositoryError('Cart not found');
        }
        throw new RepositoryError(
          `Optimistic lock failure for Cart ${cart.id}. Expected version ${expectedVersion}.`,
          undefined,
          HttpStatus.CONFLICT,
        );
      }

      await this.syncItems(manager, cart.id!, mapped.items ?? []);
    });

    const updated = await this.repository.findOne({ where: { id: cart.id! } });
    if (!updated) {
      return ErrorFactory.RepositoryError('Cart not found');
    }
    return Result.success(CartMapper.toDomain(updated));
  }

  private async syncItems(
    manager: EntityManager,
    cartId: number,
    items: CartItemEntity[],
  ): Promise<void> {
    const existing = await manager.find(CartItemEntity, {
      where: { cart: { id: cartId } },
    });
    const incomingIds = new Set(
      items.filter((item) => item.id > 0).map((item) => item.id),
    );
    const toRemove = existing.filter((item) => !incomingIds.has(item.id));
    if (toRemove.length > 0) {
      await manager.remove(CartItemEntity, toRemove);
    }
    if (items.length > 0) {
      items.forEach((item) => {
        if (!item.id) {
          delete (item as { id?: number }).id;
        }
      });
      await manager.save(CartItemEntity, items);
    }
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const result = await this.repository.delete(id);
      if (result.affected === 0) {
        return ErrorFactory.RepositoryError('Cart not found');
      }
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete cart', error);
    }
  }
}
