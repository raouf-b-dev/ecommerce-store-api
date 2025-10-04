import { OrderItem } from '../../../domain/entities/order-items';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { CreateFromEntity } from './order.mapper';

export type OrderItemCreate = CreateFromEntity<
  OrderItemEntity,
  'order' | 'product'
>;

export class OrderItemMapper {
  static toDomain(entity: OrderItemEntity): OrderItem {
    return new OrderItem({
      id: entity.id,
      productId: entity.productId,
      productName: entity.productName,
      unitPrice: entity.unitPrice,
      quantity: entity.quantity,
    });
  }
  static toEntity(domain: OrderItemCreate): OrderItemEntity {
    return Object.assign(new OrderItemEntity(), domain);
  }

  static toDomainArray(entities: OrderItemEntity[]): OrderItem[] {
    return entities.map((entity) => OrderItemMapper.toDomain(entity));
  }

  static toEntityArray(domains: OrderItemCreate[]): OrderItemEntity[] {
    return domains.map((domain) => OrderItemMapper.toEntity(domain));
  }
}
