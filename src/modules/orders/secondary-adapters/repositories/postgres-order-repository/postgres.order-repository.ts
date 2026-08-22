// src/order/infrastructure/postgres-order.repository.ts
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OrderRepository } from '../../../core/domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Order } from '../../../core/domain/entities/order';
import { OrderMapper } from '../../persistence/mappers/order.mapper';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';
import { ListOrdersQuery } from '../../../core/domain/repositories/order-repository';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { ShippingAddressEntity } from '../../orm/shipping-address.schema';

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async listOrders(
    listOrdersQuery: ListOrdersQuery,
  ): Promise<Result<Order[], RepositoryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = listOrdersQuery;

      const queryBuilder = this.ormRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.shippingAddress', 'shippingAddress');

      if (userId) {
        queryBuilder.andWhere('order.userId = :userId', { userId });
      }

      if (status) {
        queryBuilder.andWhere('order.status = :status', { status });
      }

      const sortColumn = `order.${sortBy}`;
      queryBuilder.orderBy(
        sortColumn,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
      );

      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const orderEntities = await queryBuilder.getMany();

      const orders = OrderMapper.toDomainArray(orderEntities);
      return Result.success<Order[]>(orders);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to list orders', error);
    }
  }

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Order; expectedVersion: number }, RepositoryError>
  > {
    try {
      const orderEntity = await this.ormRepo.findOne({
        where: { id },
        relations: ['items', 'shippingAddress'],
      });
      if (!orderEntity) {
        return ErrorFactory.RepositoryError('Order not found');
      }
      return Result.success({
        entity: OrderMapper.toDomain(orderEntity),
        expectedVersion: orderEntity.version,
      });
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find the order for update',
        error,
      );
    }
  }

  async save(
    order: Order,
    expectedVersion?: number,
  ): Promise<Result<Order, RepositoryError>> {
    try {
      if (expectedVersion !== undefined) {
        return await this.updateWithOptimisticLock(order, expectedVersion);
      }
      return await this.saveNormally(order);
    } catch (error: unknown) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save order', error);
    }
  }

  private async saveNormally(
    order: Order,
  ): Promise<Result<Order, RepositoryError>> {
    const orderEntity = OrderMapper.toEntity(order);
    const savedOrder = await this.ormRepo.save(orderEntity);
    order.setId(savedOrder.id);
    return Result.success<Order>(order);
  }

  private async updateWithOptimisticLock(
    order: Order,
    expectedVersion: number,
  ): Promise<Result<Order, RepositoryError>> {
    const mapped = OrderMapper.toEntity(order);
    await this.dataSource.transaction(async (manager) => {
      const updateResult = await manager
        .createQueryBuilder()
        .update(OrderEntity)
        .set({
          ...OrderMapper.toUpdatePayload(order),
          version: () => 'version + 1',
          updatedAt: () => 'CURRENT_TIMESTAMP',
        })
        .where('id = :id AND version = :expectedVersion', {
          id: order.id,
          expectedVersion,
        })
        .execute();

      if (updateResult.affected === 0) {
        const existing = await manager.findOne(OrderEntity, {
          where: { id: order.id! },
        });
        if (!existing) {
          throw new RepositoryError('Order not found');
        }
        throw new RepositoryError(
          `Optimistic lock failure for Order ${order.id}. Expected version ${expectedVersion}.`,
          undefined,
          HttpStatus.CONFLICT,
        );
      }

      await this.persistChildren(manager, mapped);
    });

    const updated = await this.ormRepo.findOne({
      where: { id: order.id! },
      relations: ['items', 'shippingAddress'],
    });
    if (!updated) {
      return ErrorFactory.RepositoryError('Order not found');
    }
    return Result.success(OrderMapper.toDomain(updated));
  }

  private async persistChildren(
    manager: EntityManager,
    mapped: OrderEntity,
  ): Promise<void> {
    if (mapped.shippingAddress) {
      await manager.save(ShippingAddressEntity, mapped.shippingAddress);
    }
    if (mapped.items?.length) {
      await manager.save(OrderItemEntity, mapped.items);
    }
  }

  async findById(id: number): Promise<Result<Order, RepositoryError>> {
    try {
      const orderEntity = await this.ormRepo.findOne({
        where: { id },
        relations: ['items', 'shippingAddress'],
      });
      if (!orderEntity) {
        return ErrorFactory.RepositoryError('Order not found');
      }

      const order = OrderMapper.toDomain(orderEntity);

      return Result.success<Order>(order);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find the order', error);
    }
  }

  async deleteById(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const deleteResult = await this.ormRepo.delete(id);
      if (deleteResult.affected === 0) {
        return ErrorFactory.RepositoryError('Order not found');
      }
      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete the order', error);
    }
  }

  async findByStatusBefore(
    status: OrderStatus,
    before: Date,
  ): Promise<Result<Order[], RepositoryError>> {
    try {
      const orderEntities = await this.ormRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.shippingAddress', 'shippingAddress')
        .where('order.status = :status', { status })
        .andWhere('order.createdAt < :before', { before })
        .getMany();

      const orders = OrderMapper.toDomainArray(orderEntities);
      return Result.success<Order[]>(orders);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find orders by status before date',
        error,
      );
    }
  }
}
