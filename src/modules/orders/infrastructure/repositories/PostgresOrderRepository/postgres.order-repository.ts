// src/order/infrastructure/postgres-order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
    private readonly idGeneratorService: IdGeneratorService,
  ) {}

  async save(
    createOrderDto: AggregatedOrderInput,
  ): Promise<Result<IOrder, RepositoryError>> {
    try {
      const savedOrder = await this.dataSource.transaction(async (manager) => {
        // Items are assumed aggregated and unique per productId
        const productIds = Array.from(
          new Set(createOrderDto.items.map((i) => i.productId)),
        ).sort();

        // 1) Atomic decrement per product using QueryBuilder (keeps lock time short)
        for (const productId of productIds) {
          const item = createOrderDto.items.find(
            (it) => it.productId === productId,
          )!;
          const qty = item.quantity;

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
            const productExists = await manager.exists(ProductEntity, {
              where: { id: productId },
            });
            if (!productExists) {
              throw ErrorFactory.RepositoryError(
                `PRODUCT_NOT_FOUND: Product ${productId} not found`,
              );
            } else {
              throw ErrorFactory.RepositoryError(
                `INSUFFICIENT_STOCK: Not enough stock for product ${productId}`,
              );
            }
          }
        }

        const orderId = await this.idGeneratorService.generateOrderId();
        const order: IOrder = {
          id: orderId,
          customerId: createOrderDto.customerId,
          status: createOrderDto.status,
          totalPrice: createOrderDto.totalPrice,
          items: createOrderDto.items.map((itemDto) =>
            manager.create(OrderItemEntity, { ...itemDto }),
          ),
          createdAt: new Date(),
        };
        const newOrder = manager.create(OrderEntity, order);

        const saved = await manager.save(newOrder);
        return saved as IOrder;
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
          const existingOrder = await manager.findOne(OrderEntity, {
            where: { id },
            relations: ['items'],
          });

          if (!existingOrder) {
            throw new RepositoryError(
              `ORDER_NOT_FOUND: Order with ID ${id} not found`,
            );
          }

          // Build old map (productId -> summed quantity) from DB rows
          const oldMap = new Map<string, number>();
          for (const it of existingOrder.items || []) {
            const prev = oldMap.get(it.productId) ?? 0;
            oldMap.set(it.productId, prev + it.quantity);
          }

          // newMap is built directly from updateOrderDto.items (already aggregated by factory)
          const newMap = new Map<string, number>();
          for (const it of updateOrderDto.items ?? []) {
            newMap.set(it.productId, it.quantity);
          }

          const allProductIds = Array.from(
            new Set([...oldMap.keys(), ...newMap.keys()]),
          ).sort();

          // Apply deltas (stock changes)
          for (const productId of allProductIds) {
            const oldQty = oldMap.get(productId) ?? 0;
            const newQty = newMap.get(productId) ?? 0;
            const delta = newQty - oldQty;

            if (delta > 0) {
              // decrement by delta atomically
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
                  throw ErrorFactory.RepositoryError(
                    `PRODUCT_NOT_FOUND: Product ${productId} not found`,
                  );
                }
                throw ErrorFactory.RepositoryError(
                  `INSUFFICIENT_STOCK: Not enough stock to increase quantity for product ${productId}`,
                );
              }
            } else if (delta < 0) {
              // increment stock by -delta
              const inc = -delta;
              await manager
                .createQueryBuilder()
                .update(ProductEntity)
                .set({ stockQuantity: () => `stock_quantity + ${inc}` })
                .where('id = :id', { id: productId })
                .execute();
            }
          }

          existingOrder.updatedAt = new Date();
          existingOrder.customerId =
            updateOrderDto.customerId ?? existingOrder.customerId;
          existingOrder.status = updateOrderDto.status ?? existingOrder.status;

          if (updateOrderDto.items && updateOrderDto.totalPrice) {
            existingOrder.items = updateOrderDto.items.map((itemDto) =>
              manager.create(OrderItemEntity, { ...itemDto }),
            );
            existingOrder.totalPrice = updateOrderDto.totalPrice;
          }

          const saved = await manager.save(existingOrder);
          return saved as IOrder;
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

  async findAll(): Promise<Result<IOrder[], RepositoryError>> {
    try {
      const ordersList = await this.ormRepo.find({ relations: ['items'] });
      return Result.success<IOrder[]>(ordersList);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find orders', error);
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
}
