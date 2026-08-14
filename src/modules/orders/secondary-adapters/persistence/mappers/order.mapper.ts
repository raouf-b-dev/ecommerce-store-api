// src/modules/orders/infrastructure/mappers/order.mapper.ts
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { UpdateFromEntity } from '../../../../../infrastructure/mappers/utils/update-from-entity.type';
import { Order, OrderProps } from '../../../core/domain/entities/order';
import { OrderItemProps } from '../../../core/domain/entities/order-items';
import { IOrder } from '../../../core/domain/interfaces/order.interface';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { OrderEntity } from '../../orm/order.schema';
import { OrderItemMapper } from './order-item.mapper';
import { ShippingAddressMapper } from './shipping-address.mapper';

type OrderCreate = CreateFromEntity<OrderEntity, 'items' | 'version'>;

export type OrderUpdate = UpdateFromEntity<
  OrderEntity,
  'id' | 'version' | 'createdAt' | 'updatedAt' | 'items' | 'shippingAddress'
>; // persistence-owned + children synced after the OCC parent UPDATE

export type OrderForCache = Omit<IOrder, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

export class OrderMapper {
  static toDomain(entity: OrderEntity): Order {
    const props: OrderProps = {
      id: entity.id,
      userId: entity.userId,
      paymentId: entity.paymentId,
      paymentMethod: entity.paymentMethod,
      shippingAddressId: entity.shippingAddressId,
      shippingAddress: ShippingAddressMapper.toDomain(
        entity.shippingAddress,
      ).toPrimitives(),
      items: entity.items.map((itemEntity): OrderItemProps =>
        OrderItemMapper.toDomain(itemEntity).toPrimitives(),
      ),
      userNotes: entity.userNotes,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Order.fromPrimitives(props);
  }

  static toEntity(domain: Order): OrderEntity {
    const primitives = domain.toPrimitives();

    const orderPayload: OrderCreate = {
      id: primitives.id || 0,
      userId: primitives.userId,
      paymentId: primitives.paymentId,
      paymentMethod: primitives.paymentMethod,
      shippingAddressId: primitives.shippingAddressId || 0,
      shippingAddress: ShippingAddressMapper.toEntity(
        primitives.shippingAddress,
      ),
      userNotes: primitives.userNotes ?? '',
      status: primitives.status,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
      subtotal: primitives.subtotal,
      shippingCost: primitives.shippingCost,
      totalPrice: primitives.totalPrice,
    };

    const orderEntity: OrderEntity = Object.assign(
      new OrderEntity(),
      orderPayload,
    );

    const orderItemsEntities: OrderItemEntity[] = OrderItemMapper.toEntityArray(
      domain.getItems(),
    );

    orderEntity.items = orderItemsEntities.map((orderItemEntity) => {
      orderItemEntity.order = orderEntity;
      return orderItemEntity;
    });

    return orderEntity;
  }

  static toUpdatePayload(domain: Order): OrderUpdate {
    const entity = OrderMapper.toEntity(domain);

    return {
      userId: entity.userId,
      paymentId: entity.paymentId,
      paymentMethod: entity.paymentMethod,
      shippingAddressId: entity.shippingAddressId,
      userNotes: entity.userNotes,
      subtotal: entity.subtotal,
      shippingCost: entity.shippingCost,
      totalPrice: entity.totalPrice,
      status: entity.status,
    };
  }

  static toDomainArray(entities: OrderEntity[]): Order[] {
    return entities.map((entity) => OrderMapper.toDomain(entity));
  }

  static toEntityArray(domains: Order[]): OrderEntity[] {
    return domains.map((domain) => OrderMapper.toEntity(domain));
  }
}

export class OrderCacheMapper {
  public static toCache(domain: Order): OrderForCache {
    const primitives = domain.toPrimitives();
    return {
      ...primitives,
      createdAt: primitives.createdAt.getTime(),
      updatedAt: primitives.updatedAt.getTime(),
    };
  }

  public static fromCache(cachedOrder: OrderForCache): Order {
    const orderDomain = Order.fromPrimitives({
      ...cachedOrder,
      createdAt: new Date(cachedOrder.createdAt),
      updatedAt: new Date(cachedOrder.updatedAt),
    });
    return orderDomain;
  }
}
