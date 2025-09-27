// src/modules/orders/infrastructure/mappers/order.mapper.ts
import { Order, OrderProps } from '../../../domain/entities/order';
import { OrderItemProps } from '../../../domain/entities/order-items';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { OrderEntity } from '../../orm/order.schema';
import { CustomerInfoMapper } from './customer-info.mapper';
import { PaymentInfoMapper } from './payment-info.mapper';
import { ShippingAddressMapper } from './shipping-address.mapper';

type CreateFromEntity<T, ExcludeKeys extends keyof T = never> = Required<
  Omit<T, ExcludeKeys>
>;
type OrderCreate = CreateFromEntity<OrderEntity, 'items'>;
type OrderItemCreate = CreateFromEntity<OrderItemEntity, 'order' | 'product'>;

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
        (itemEntity): OrderItemProps => ({
          id: itemEntity.id,
          productId: itemEntity.productId,
          productName: itemEntity.productName,
          unitPrice: itemEntity.unitPrice,
          quantity: itemEntity.quantity,
        }),
      ),
      customerNotes: entity.customerNotes,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Order.fromPrimitives(props);
  }

  static toEntity(primitives: IOrder): OrderEntity {
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

    const itemPayloads: OrderItemCreate[] = primitives.items.map(
      (item): OrderItemCreate => {
        const itemEntity: OrderItemCreate = {
          id: item.id,
          productId: item.productId,
          productName: item.productName ?? '',
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        };

        return itemEntity;
      },
    );

    orderEntity.items = itemPayloads.map((itemPayload) => {
      const item = Object.assign(new OrderItemEntity(), itemPayload);
      item.order = orderEntity;
      return item;
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

export type OrderForCache = Omit<IOrder, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

export class OrderCacheMapper {
  public static toCache(order: IOrder): OrderForCache {
    return {
      ...order,
      createdAt: order.createdAt.getTime(),
      updatedAt: order.updatedAt.getTime(),
    };
  }

  public static fromCache(cachedOrder: OrderForCache): IOrder {
    return {
      ...cachedOrder,
      createdAt: new Date(cachedOrder.createdAt),
      updatedAt: new Date(cachedOrder.updatedAt),
    };
  }
}
