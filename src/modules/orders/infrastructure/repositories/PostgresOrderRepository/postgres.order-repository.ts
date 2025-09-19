// src/order/infrastructure/postgres-order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { ProductEntity } from '../../../../products/infrastructure/orm/product.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import {
  AggregatedOrderInput,
  AggregatedUpdateInput,
} from '../../../domain/factories/order.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { OrderItemProps } from '../../../domain/entities/order-items';
import {
  OrderStatus,
  OrderStatusVO,
} from '../../../domain/value-objects/order-status';
import { Order } from '../../../domain/entities/order';

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
    private readonly idGeneratorService: IdGeneratorService,
  ) {}
  async listOrders(
    listOrdersQueryDto: ListOrdersQueryDto,
  ): Promise<Result<IOrder[], RepositoryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        customerId,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = listOrdersQueryDto;

      // Create query builder
      const queryBuilder = this.ormRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items');

      // Apply filters
      if (customerId) {
        queryBuilder.andWhere('order.customerId = :customerId', { customerId });
      }

      if (status) {
        queryBuilder.andWhere('order.status = :status', { status });
      }

      // Apply sorting
      const sortColumn = `order.${sortBy}`;
      queryBuilder.orderBy(
        sortColumn,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
      );

      // Apply pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      // Execute query
      const orders = await queryBuilder.getMany();

      return Result.success<IOrder[]>(orders);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to list orders', error);
    }
  }

  async save(
    createOrderDto: AggregatedOrderInput,
  ): Promise<Result<IOrder, RepositoryError>> {
    try {
      const savedOrder = await this.dataSource.transaction(async (manager) => {
        const productIds = Array.from(
          new Set(createOrderDto.items.map((i) => i.productId)),
        ).sort();

        const products = await manager.find(ProductEntity, {
          where: { id: In(productIds) },
        });

        const productMap = new Map<string, ProductEntity>();
        for (const p of products) productMap.set(p.id, p);

        for (const pid of productIds) {
          if (!productMap.has(pid)) {
            throw new RepositoryError(
              `PRODUCT_NOT_FOUND: Product ${pid} not found`,
            );
          }
        }

        for (const it of createOrderDto.items) {
          if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
            throw new RepositoryError(
              `INVALID_QUANTITY: quantity must be a positive integer for product ${it.productId}`,
            );
          }
        }
        for (const productId of productIds) {
          const itemDto = createOrderDto.items.find(
            (it) => it.productId === productId,
          )!;
          const qty = itemDto.quantity;

          const updateResult = await manager
            .createQueryBuilder()
            .update(ProductEntity)
            .set({ stockQuantity: () => `stock_quantity - ${qty}` })
            .where('id = :id AND stock_quantity >= :quantity', {
              id: productId,
              quantity: qty,
            })
            .execute();

          if (updateResult.affected === 0) {
            const exists = await manager.exists(ProductEntity, {
              where: { id: productId },
            });
            if (!exists) {
              throw new RepositoryError(
                `PRODUCT_NOT_FOUND: Product ${productId} not found`,
              );
            } else {
              throw new RepositoryError(
                `INSUFFICIENT_STOCK: Not enough stock for product ${productId}`,
              );
            }
          }
        }

        const domainOrderItems: OrderItemProps[] = createOrderDto.items.map(
          (itemDto) => {
            const product = productMap.get(itemDto.productId)!;

            return {
              productId: product.id,
              productName: product.name,
              unitPrice: product.price,
              quantity: itemDto.quantity,
            };
          },
        );

        const orderId = await this.idGeneratorService.generateOrderId();

        const domainOrder = Order.create({
          id: orderId,
          customerId: createOrderDto.customerId,
          items: domainOrderItems,
        });

        const orderPrimitives = domainOrder.toPrimitives();

        const orderItemEntities = domainOrder.items.map((item) => {
          return manager.create(OrderItemEntity, item.toPrimitives());
        });

        const completeOrder: IOrder = {
          ...orderPrimitives,
          items: orderItemEntities,
        };

        const orderEntity = manager.create(OrderEntity, completeOrder);

        const savedEntity = await manager.save(orderEntity);

        return savedEntity;
      });

      return Result.success<IOrder>(savedOrder);
    } catch (error: any) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to create order', error);
    }
  }

  async update(
    id: string,
    updateOrderDto: AggregatedUpdateInput,
  ): Promise<Result<IOrder, RepositoryError>> {
    try {
      const updatedOrder = await this.dataSource.transaction(
        async (manager) => {
          const existingOrderEntity = await manager.findOne(OrderEntity, {
            where: { id },
            relations: ['items'],
          });

          if (!existingOrderEntity) {
            throw new RepositoryError(
              `ORDER_NOT_FOUND: Order with ID ${id} not found`,
            );
          }

          const oldMap = new Map<string, number>();
          for (const it of existingOrderEntity.items || []) {
            const prev = oldMap.get(it.productId) ?? 0;
            oldMap.set(it.productId, prev + it.quantity);
          }

          const newMap = new Map<string, number>();
          for (const it of updateOrderDto.items ?? []) {
            newMap.set(it.productId, it.quantity);
          }

          const allProductIds = Array.from(
            new Set([...oldMap.keys(), ...newMap.keys()]),
          ).sort();

          const products = allProductIds.length
            ? await manager.find(ProductEntity, {
                where: { id: In(allProductIds) },
              })
            : [];

          const productMap = new Map<string, ProductEntity>();
          for (const p of products) productMap.set(p.id, p);

          for (const pid of newMap.keys()) {
            if (!productMap.has(pid)) {
              throw new RepositoryError(
                `PRODUCT_NOT_FOUND: Product ${pid} not found`,
              );
            }
          }

          for (const it of updateOrderDto.items ?? []) {
            if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
              throw new RepositoryError(
                `INVALID_QUANTITY: quantity must be a positive integer for product ${it.productId}`,
              );
            }
          }

          for (const productId of allProductIds) {
            const oldQty = oldMap.get(productId) ?? 0;
            const newQty = newMap.get(productId) ?? 0;
            const delta = newQty - oldQty;

            if (delta > 0) {
              const updateResult = await manager
                .createQueryBuilder()
                .update(ProductEntity)
                .set({ stockQuantity: () => `stock_quantity - ${delta}` })
                .where('id = :id AND stock_quantity >= :quantity', {
                  id: productId,
                  quantity: delta,
                })
                .execute();

              if (updateResult.affected === 0) {
                const exists = await manager.exists(ProductEntity, {
                  where: { id: productId },
                });
                if (!exists) {
                  throw new RepositoryError(
                    `PRODUCT_NOT_FOUND: Product ${productId} not found`,
                  );
                }
                throw new RepositoryError(
                  `INSUFFICIENT_STOCK: Not enough stock to increase quantity for product ${productId}`,
                );
              }
            } else if (delta < 0) {
              const inc = -delta;
              await manager
                .createQueryBuilder()
                .update(ProductEntity)
                .set({ stockQuantity: () => `stock_quantity + ${inc}` })
                .where('id = :id', { id: productId })
                .execute();
            }
          }

          if (updateOrderDto.items) {
            const newDomainItems: OrderItemProps[] = updateOrderDto.items.map(
              (itemDto) => {
                const product = productMap.get(itemDto.productId)!;
                return {
                  productId: product.id,
                  productName: product.name,
                  unitPrice: product.price,
                  quantity: itemDto.quantity,
                };
              },
            );

            const newDomainOrder = new Order({
              ...existingOrderEntity,
              items: newDomainItems,
              updatedAt: new Date(),
            });

            await manager.delete(OrderItemEntity, { order: { id } as any });

            const orderPrimitives = newDomainOrder.toPrimitives();
            const newOrderItemEntities = newDomainOrder.items.map((item) =>
              manager.create(OrderItemEntity, item.toPrimitives()),
            );

            existingOrderEntity.items = newOrderItemEntities;
            existingOrderEntity.totalPrice = orderPrimitives.totalPrice;
            existingOrderEntity.updatedAt = orderPrimitives.updatedAt;
          } else {
            existingOrderEntity.updatedAt = new Date();
          }

          const savedEntity = await manager.save(existingOrderEntity);
          return savedEntity as IOrder;
        },
      );

      return Result.success<IOrder>(updatedOrder);
    } catch (error: any) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to update order', error);
    }
  }

  async findById(id: string): Promise<Result<IOrder, RepositoryError>> {
    try {
      const order = await this.ormRepo.findOne({
        where: { id },
        relations: ['items'],
      });
      if (!order) {
        return ErrorFactory.RepositoryError('Order not found');
      }

      return Result.success<IOrder>(order);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find the order', error);
    }
  }

  async deleteById(id: string): Promise<Result<void, RepositoryError>> {
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

  async cancelById(id: string): Promise<Result<IOrder, RepositoryError>> {
    try {
      const updatedOrder = await this.dataSource.transaction(
        async (manager) => {
          const existingOrder = await manager.findOne(OrderEntity, {
            where: { id },
            relations: ['items'],
          });

          if (!existingOrder) {
            throw new RepositoryError(
              `ORDER_NOT_FOUND: Order with ID ${id} not found`,
            );
          }

          const currentStatus = new OrderStatusVO(existingOrder.status);

          if (!currentStatus.canTransitionTo(OrderStatus.CANCELLED)) {
            throw new RepositoryError(
              `ORDER_CANNOT_BE_CANCELLED: Cannot cancel order with status "${currentStatus.value}"`,
            );
          }

          // Restore product stock
          for (const item of existingOrder.items) {
            await manager
              .createQueryBuilder()
              .update(ProductEntity)
              .set({ stockQuantity: () => `stock_quantity + ${item.quantity}` })
              .where('id = :id', { id: item.productId })
              .execute();
          }

          // Update order status
          existingOrder.status = OrderStatus.CANCELLED;
          existingOrder.updatedAt = new Date();

          const savedOrder = await manager.save(existingOrder);
          return savedOrder as IOrder;
        },
      );

      return Result.success<IOrder>(updatedOrder);
    } catch (error: any) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to cancel order', error);
    }
  }
}
