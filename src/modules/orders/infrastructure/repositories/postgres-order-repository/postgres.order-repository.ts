// src/order/infrastructure/postgres-order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { ProductEntity } from '../../../../products/infrastructure/orm/product.schema';
import { InventoryEntity } from '../../../../inventory/infrastructure/orm/inventory.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { AggregatedOrderInput } from '../../../domain/factories/order.factory';
import { ListOrdersQueryDto } from '../../../presentation/dto/list-orders-query.dto';
import { OrderItemProps } from '../../../domain/entities/order-items';
import { Order } from '../../../domain/entities/order';
import { OrderMapper } from '../../persistence/mappers/order.mapper';
import { CreateOrderItemDto } from '../../../presentation/dto/create-order-item.dto';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address';

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

  async save(
    createOrderDto: AggregatedOrderInput,
  ): Promise<Result<Order, RepositoryError>> {
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

        for (const item of createOrderDto.items) {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            throw new RepositoryError(
              `INVALID_QUANTITY: quantity must be a positive integer for product ${item.productId}`,
            );
          }
        }

        // Stock reservation within transaction for atomicity
        for (const productId of productIds) {
          const itemDto = createOrderDto.items.find(
            (it) => it.productId === productId,
          )!;
          const qty = itemDto.quantity;

          const updateResult = await manager
            .createQueryBuilder()
            .update(InventoryEntity)
            .set({ availableQuantity: () => `available_quantity - ${qty}` })
            .where('product_id = :id AND available_quantity >= :quantity', {
              id: productId,
              quantity: qty,
            })
            .execute();

          if (updateResult.affected === 0) {
            const exists = await manager.exists(InventoryEntity, {
              where: { productId },
            });
            if (!exists) {
              throw new RepositoryError(
                `INVENTORY_NOT_FOUND: Inventory for product ${productId} not found`,
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
            const props: OrderItemProps = {
              id: null,
              productId: product.id,
              productName: product.name,
              unitPrice: product.price,
              quantity: itemDto.quantity,
            };
            return props;
          },
        );

        const orderId = await this.idGeneratorService.generateOrderId();
        const shippingAddressId =
          await this.idGeneratorService.generateShippingAddressId();

        const shippingAddressProps: ShippingAddressProps = {
          ...createOrderDto.shippingAddress,
          id: shippingAddressId,
          phone: createOrderDto.shippingAddress.phone || null,
        };

        const domainOrder = Order.create({
          id: orderId,
          customerId: createOrderDto.customerId,
          paymentMethod: createOrderDto.paymentMethod,
          items: domainOrderItems,
          shippingAddress: shippingAddressProps,
          customerNotes: createOrderDto.customerNotes || null,
        });

        const orderEntity = OrderMapper.toEntity(domainOrder);

        return await manager.save(orderEntity);
      });

      const domainOrder = OrderMapper.toDomain(savedOrder);

      return Result.success<Order>(domainOrder);
    } catch (error: any) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to create order', error);
    }
  }

  async updateStatus(
    id: string,
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
    orderId: string,
    paymentId: string,
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
    id: string,
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

          const oldMap = new Map<string, number>();
          for (const item of existingDomainOrder.getItems()) {
            const itemPrimitives = item.toPrimitives();
            const prev = oldMap.get(itemPrimitives.productId) ?? 0;
            oldMap.set(
              itemPrimitives.productId,
              prev + itemPrimitives.quantity,
            );
          }

          const newMap = new Map<string, number>();
          for (const item of updateOrderItemDto) {
            newMap.set(item.productId, item.quantity);
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

          for (const item of updateOrderItemDto) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
              throw new RepositoryError(
                `INVALID_QUANTITY: quantity must be a positive integer for product ${item.productId}`,
              );
            }
          }

          // Stock adjustment within transaction
          for (const productId of allProductIds) {
            const oldQty = oldMap.get(productId) ?? 0;
            const newQty = newMap.get(productId) ?? 0;
            const delta = newQty - oldQty;

            if (delta > 0) {
              const updateResult = await manager
                .createQueryBuilder()
                .update(InventoryEntity)
                .set({
                  availableQuantity: () => `available_quantity - ${delta}`,
                })
                .where('product_id = :id AND available_quantity >= :quantity', {
                  id: productId,
                  quantity: delta,
                })
                .execute();

              if (updateResult.affected === 0) {
                const exists = await manager.exists(InventoryEntity, {
                  where: { productId },
                });
                if (!exists) {
                  throw new RepositoryError(
                    `INVENTORY_NOT_FOUND: Inventory for product ${productId} not found`,
                  );
                }
                throw new RepositoryError(
                  `INSUFFICIENT_STOCK: Not enough stock to increase quantity for product ${productId}`,
                );
              }
            } else if (delta < 0) {
              const returnQty = -delta;
              await manager
                .createQueryBuilder()
                .update(InventoryEntity)
                .set({
                  availableQuantity: () => `available_quantity + ${returnQty}`,
                })
                .where('product_id = :id', { id: productId })
                .execute();
            }
          }

          const newDomainItems: OrderItemProps[] = updateOrderItemDto.map(
            (itemDto: CreateOrderItemDto) => {
              const product = productMap.get(itemDto.productId)!;
              const props: OrderItemProps = {
                id: null,
                productId: product.id,
                productName: product.name,
                unitPrice: product.price,
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

          await manager.delete(OrderItemEntity, { order: { id } as any });

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

  async findById(id: string): Promise<Result<Order, RepositoryError>> {
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

  async cancelOrder(
    orderPrimitives: Order,
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.dataSource.transaction(async (manager) => {
        // Release stock back to inventory
        for (const item of orderPrimitives.toPrimitives().items) {
          await manager
            .createQueryBuilder()
            .update(InventoryEntity)
            .set({
              availableQuantity: () => `available_quantity + ${item.quantity}`,
            })
            .where('product_id = :id', { id: item.productId })
            .execute();
        }

        const updatedEntity = OrderMapper.toEntity(orderPrimitives);

        await manager.save(updatedEntity);
      });

      return Result.success<void>(undefined);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to cancel order', error);
    }
  }
}
