// src/modules/carts/infrastructure/persistence/mappers/cart.mapper.ts
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { UpdateFromEntity } from '../../../../../infrastructure/mappers/utils/update-from-entity.type';
import { Cart, CartProps } from '../../../core/domain/entities/cart';
import { ICart } from '../../../core/domain/interfaces/cart.interface';
import { CartEntity } from '../../orm/cart.schema';
import { CartItemEntity } from '../../orm/cart-item.schema';
import { CartItemMapper } from './cart-item.mapper';

type CartCreate = CreateFromEntity<CartEntity, 'items' | 'version'>;

export type CartUpdate = UpdateFromEntity<
  CartEntity,
  'id' | 'version' | 'createdAt' | 'updatedAt' | 'items'
>; // persistence-owned + items synced after the OCC parent UPDATE

export type CartForCache = Omit<ICart, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

export class CartMapper {
  static toDomain(entity: CartEntity): Cart {
    const props: CartProps = {
      id: entity.id || null,
      userId: entity.userId,
      items: entity.items.map((item) => CartItemMapper.toDomain(item).props),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Cart.fromPrimitives(props);
  }

  static toEntity(domain: Cart): CartEntity {
    const primitives = domain.toPrimitives();

    const cartPayload: CartCreate = {
      id: primitives.id || 0,
      userId: primitives.userId,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    const entity: CartEntity = Object.assign(new CartEntity(), cartPayload);

    const itemEntities: CartItemEntity[] = CartItemMapper.toEntityArray(
      domain.getItems(),
    );

    entity.items = itemEntities.map((itemEntity) => {
      itemEntity.cart = entity;
      return itemEntity;
    });

    return entity;
  }

  static toUpdatePayload(domain: Cart): CartUpdate {
    const entity = CartMapper.toEntity(domain);

    return {
      userId: entity.userId,
    };
  }
}

export class CartCacheMapper {
  static toCache(domain: Cart): CartForCache {
    const primitives = domain.toPrimitives();
    return {
      ...primitives,
      createdAt: primitives.createdAt.getTime(),
      updatedAt: primitives.updatedAt.getTime(),
    };
  }

  static fromCache(cached: CartForCache): Cart | null {
    try {
      return Cart.fromPrimitives({
        ...cached,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
      });
    } catch {
      return null;
    }
  }
}
