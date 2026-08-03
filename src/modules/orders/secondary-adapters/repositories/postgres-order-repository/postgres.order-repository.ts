// src/order/infrastructure/postgres-order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderRepository } from '../../../core/domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Order } from '../../../core/domain/entities/order';
import { OrderMapper } from '../../persistence/mappers/order.mapper';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';
import { ListOrdersQuery } from '../../../core/domain/repositories/order-repository';

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
      const orderEntity = OrderMapper.toEntity(order);
      if (expectedVersion !== undefined) {
        orderEntity.version = expectedVersion;
      }
      const savedOrder = await this.ormRepo.save(orderEntity);
      order.setId(savedOrder.id);
      return Result.success<Order>(order);
    } catch (error: any) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save order', error);
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
