import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import {
  OrderItem,
  OrderItemProps,
} from '../../../core/domain/entities/order-items';
import { persistedChildId } from '../../../../../infrastructure/mappers/utils/persisted-child-id.util';
import { OrderItemEntity } from '../../orm/order-item.schema';
import {
  decimalFromMinorUnits,
  requireMinorUnits,
} from '../../../../../shared-kernel/domain/value-objects/money-decimal';

export type OrderItemCreate = CreateFromEntity<OrderItemEntity, 'order'>;

// order_items has no currency column. Reload uses the single store currency
// until the FX phase adds the column and a store-currency port.
const ORDER_LINE_CURRENCY = 'USD';

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
      currency: ORDER_LINE_CURRENCY,
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
