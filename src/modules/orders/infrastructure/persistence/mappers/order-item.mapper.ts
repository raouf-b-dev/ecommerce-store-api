import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import {
  OrderItem,
  OrderItemProps,
} from '../../../domain/entities/order-items';
import { OrderItemEntity } from '../../orm/order-item.schema';

export type OrderItemCreate = CreateFromEntity<
  OrderItemEntity,
  'order' | 'product'
>;

export class OrderItemMapper {
  static toDomain(entity: OrderItemEntity): OrderItem {
    const orderItemProps: OrderItemProps = {
      id: entity.id,
      productId: entity.productId,
      productName: entity.productName,
      unitPrice: entity.unitPrice,
      quantity: entity.quantity,
    };
    return new OrderItem(orderItemProps);
  }
  static toEntity(domain: OrderItem): OrderItemEntity {
    const primitives = domain.toPrimitives();
    const itemPayload: OrderItemCreate = {
      id: primitives.id,
      productId: primitives.productId,
      productName: primitives.productName,
      unitPrice: primitives.unitPrice,
      quantity: primitives.quantity,
      lineTotal: primitives.lineTotal,
    };
    return Object.assign(new OrderItemEntity(), itemPayload);
  }

  static toDomainArray(entities: OrderItemEntity[]): OrderItem[] {
    return entities.map((entity) => OrderItemMapper.toDomain(entity));
  }

  static toEntityArray(domains: OrderItem[]): OrderItemEntity[] {
    return domains.map((domain) => OrderItemMapper.toEntity(domain));
  }
}
