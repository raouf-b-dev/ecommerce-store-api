// src/modules/orders/infrastructure/mappers/order.mapper.ts
import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import { Order, OrderProps } from '../../../domain/entities/order';
import {
  OrderItem,
  OrderItemProps,
} from '../../../domain/entities/order-items';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { OrderEntity } from '../../orm/order.schema';
import { CustomerInfoMapper } from './customer-info.mapper';
import { OrderItemCreate, OrderItemMapper } from './order-item.mapper';
import { PaymentInfoMapper } from './payment-info.mapper';
import { ShippingAddressMapper } from './shipping-address.mapper';

type OrderCreate = CreateFromEntity<OrderEntity, 'items'>;

export type OrderForCache = Omit<IOrder, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};
export class OrderMapper {
  static toDomain(entity: OrderEntity): Order {
    const props: OrderProps = {
      id: entity.id,
      customerId: entity.customerId,
      paymentInfoId: entity.paymentInfoId,
      shippingAddressId: entity.shippingAddressId,
      customerInfo: CustomerInfoMapper.toDomain(
        entity.customerInfo,
      ).toPrimitives(),
      paymentInfo: PaymentInfoMapper.toDomain(
        entity.paymentInfo,
      ).toPrimitives(),
      shippingAddress: ShippingAddressMapper.toDomain(
        entity.shippingAddress,
      ).toPrimitives(),
      items: entity.items.map(
        (itemEntity): OrderItemProps =>
          OrderItemMapper.toDomain(itemEntity).toPrimitives(),
      ),
      customerNotes: entity.customerNotes,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Order.fromPrimitives(props);
  }

  static toEntity(domain: Order): OrderEntity {
    const primitives = domain.toPrimitives();

    const orderPayload: OrderCreate = {
      id: primitives.id,
      customerId: primitives.customerId,
      paymentInfoId: primitives.paymentInfoId,
      shippingAddressId: primitives.shippingAddressId,
      customerInfo: CustomerInfoMapper.toEntity(primitives.customerInfo),
      paymentInfo: PaymentInfoMapper.toEntity(primitives.paymentInfo),
      shippingAddress: ShippingAddressMapper.toEntity(
        primitives.shippingAddress,
      ),
      customerNotes: primitives.customerNotes ?? '',
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
