import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import {
  OrderItem,
  OrderItemProps,
} from '../../../core/domain/entities/order-items';
import { persistedChildId } from '../../../../../infrastructure/mappers/utils/persisted-child-id.util';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { decimalFromMinorUnits } from '../../../../../shared-kernel/domain/value-objects/money-decimal';
import { requireMinorUnits } from '../../../../../infrastructure/mappers/utils/decimal-money.util';

export type OrderItemCreate = CreateFromEntity<OrderItemEntity, 'order'>;

export class OrderItemMapper {
  static toDomain(entity: OrderItemEntity): OrderItem {
    const orderItemProps: OrderItemProps = {
      id: entity.id,
      productId: entity.productId,
      productName: entity.productName || 'Unknown Product',
      sku: entity.sku || null,
      imageUrl: entity.imageUrl || null,
      unitPrice: requireMinorUnits(entity.unitPrice),
      quantity: entity.quantity,
      currency: entity.currency,
    };
    return new OrderItem(orderItemProps);
  }

  static toEntity(domain: OrderItem): OrderItemEntity {
    const primitives = domain.toPrimitives();
    const itemPayload: Omit<OrderItemCreate, 'id'> & { id?: number } = {
      productId: primitives.productId,
      productName: primitives.productName,
      sku: primitives.sku || null,
      imageUrl: primitives.imageUrl || null,
      unitPrice: Number(decimalFromMinorUnits(primitives.unitPrice)),
      quantity: primitives.quantity,
      lineTotal: Number(decimalFromMinorUnits(primitives.lineTotal)),
      currency: primitives.currency,
    };
    const entity = Object.assign(new OrderItemEntity(), itemPayload);
    const persistedId = persistedChildId(primitives.id);
    if (persistedId !== undefined) {
      entity.id = persistedId;
    }
    return entity;
  }

  static toDomainArray(entities: OrderItemEntity[]): OrderItem[] {
    return entities.map((entity) => OrderItemMapper.toDomain(entity));
  }

  static toEntityArray(domains: OrderItem[]): OrderItemEntity[] {
    return domains.map((domain) => OrderItemMapper.toEntity(domain));
  }
}
