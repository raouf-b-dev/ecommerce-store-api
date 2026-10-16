// src/modules/carts/infrastructure/persistence/mappers/cart-item.mapper.ts
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import {
  CartItem,
  CartItemProps,
} from '../../../core/domain/entities/cart-item';
import { persistedChildId } from '../../../../../infrastructure/mappers/utils/persisted-child-id.util';
import { CartItemEntity } from '../../orm/cart-item.schema';
import {
  requireMajorUnitsFromMinor,
  requireMinorUnits,
} from '../../../../../infrastructure/mappers/utils/decimal-money.util';

export type CartItemCreate = CreateFromEntity<CartItemEntity, 'cart'>;

export class CartItemMapper {
  static toDomain(entity: CartItemEntity): CartItem {
    const props: CartItemProps = {
      id: entity.id ?? null,
      productId: entity.productId,
      productName: entity.productName,
      price: requireMinorUnits(entity.price, entity.currency),
      currency: entity.currency,
      quantity: entity.quantity,
      imageUrl: entity.imageUrl,
      sku: entity.sku,
    };

    return CartItem.fromPrimitives(props);
  }

  static toEntity(domain: CartItem): CartItemEntity {
    const primitives = domain.toPrimitives();
    const itemPayload: Omit<CartItemCreate, 'id'> & { id?: number } = {
      productId: primitives.productId,
      productName: primitives.productName,
      price: requireMajorUnitsFromMinor(primitives.price, primitives.currency),
      currency: primitives.currency,
      quantity: primitives.quantity,
      imageUrl: primitives.imageUrl,
      sku: primitives.sku,
    };
    const entity = Object.assign(new CartItemEntity(), itemPayload);
    const persistedId = persistedChildId(primitives.id);
    if (persistedId !== undefined) {
      entity.id = persistedId;
    }
    return entity;
  }

  static toEntityArray(domains: CartItem[]): CartItemEntity[] {
    return domains.map((domain) => CartItemMapper.toEntity(domain));
  }
}
