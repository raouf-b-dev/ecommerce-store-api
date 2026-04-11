// src/order/infrastructure/postgres-order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderRepository } from '../../../core/domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { ListOrdersQueryDto } from '../../../primary-adapters/dto/list-orders-query.dto';
import { OrderItemProps } from '../../../core/domain/entities/order-items';
import { Order } from '../../../core/domain/entities/order';
import { OrderMapper } from '../../persistence/mappers/order.mapper';
import { CreateOrderItemDto } from '../../../primary-adapters/dto/create-order-item.dto';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
  ): Promise<Result<Order[], RepositoryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        customerId,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = listOrdersQueryDto;

      const queryBuilder = this.ormRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('order.shippingAddress', 'shippingAddress');

      if (customerId) {
        queryBuilder.andWhere('order.customerId = :customerId', { customerId });
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

  async save(order: Order): Promise<Result<Order, RepositoryError>> {
    try {
      const orderEntity = OrderMapper.toEntity(order);
      const savedOrder = await this.ormRepo.save(orderEntity);
      const domainOrder = OrderMapper.toDomain(savedOrder);

      return Result.success<Order>(domainOrder);
    } catch (error: any) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save order', error);
    }
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const updateResult = await this.ormRepo.update(id, {
        status,
        updatedAt: new Date(),
      });

      if (updateResult.affected === 0) {
        return ErrorFactory.RepositoryError('Order not found');
      }

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to update order status',
        error,
      );
    }
  }

  async updatePaymentId(
    orderId: number,
    paymentId: number,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const updateResult = await this.ormRepo.update(orderId, {
        paymentId,
        updatedAt: new Date(),
      });

      if (updateResult.affected === 0) {
        return ErrorFactory.RepositoryError('Order not found');
      }

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to update order payment ID',
        error,
      );
    }
  }

  async updateItemsInfo(
    id: number,
    updateOrderItemDto: CreateOrderItemDto[],
  ): Promise<Result<Order, RepositoryError>> {
    try {
      const updatedOrderEntity = await this.dataSource.transaction(
        async (manager) => {
          const existingOrderEntity = await manager.findOne(OrderEntity, {
            where: { id },
            relations: ['items', 'shippingAddress'],
          });

          if (!existingOrderEntity) {
            throw new RepositoryError(
              `ORDER_NOT_FOUND: Order with ID ${id} not found`,
            );
          }

          const existingDomainOrder = OrderMapper.toDomain(existingOrderEntity);

          for (const item of updateOrderItemDto) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
              throw new RepositoryError(
                `INVALID_QUANTITY: quantity must be a positive integer for product ${item.productId}`,
              );
            }
          }

          const newDomainItems: OrderItemProps[] = updateOrderItemDto.map(
            (itemDto: CreateOrderItemDto) => {
              const props: OrderItemProps = {
                id: null,
                productId: itemDto.productId,
                productName: itemDto.productName,
                unitPrice: itemDto.unitPrice,
                quantity: itemDto.quantity,
              };
              return props;
            },
          );

          const existingPrimitives = existingDomainOrder.toPrimitives();

          const updatedDomainOrder = new Order({
            ...existingPrimitives,
            items: newDomainItems,
            updatedAt: new Date(),
          });

          await manager.delete(OrderItemEntity, {
            order: { id },
          });

          const updatedOrderEntity = OrderMapper.toEntity(updatedDomainOrder);

          const savedEntity = await manager.save(updatedOrderEntity);
          return savedEntity;
        },
      );

      const domainOrder = OrderMapper.toDomain(updatedOrderEntity);

      return Result.success<Order>(domainOrder);
    } catch (error: any) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to update order', error);
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

  async cancelOrder(
    orderPrimitives: Order,
  ): Promise<Result<void, RepositoryError>> {
    try {
      // Stock release is handled by the SAGA (ReleaseOrderStockUseCase)
      // Repository only persists the cancelled order state
      const updatedEntity = OrderMapper.toEntity(orderPrimitives);
      await this.ormRepo.save(updatedEntity);

      return Result.success<void>(undefined);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to cancel order', error);
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
