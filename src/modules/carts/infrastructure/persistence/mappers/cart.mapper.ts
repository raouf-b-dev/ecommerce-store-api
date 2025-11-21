// src/modules/carts/infrastructure/persistence/mappers/cart.mapper.ts
import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import { Cart, CartProps } from '../../../domain/entities/cart';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartEntity } from '../../orm/cart.schema';
import { CartItemEntity } from '../../orm/cart-item.schema';
import { CartItemMapper } from './cart-item.mapper';

type CartCreate = CreateFromEntity<CartEntity, 'items'>;

export type CartForCache = Omit<ICart, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

export class CartMapper {
  static toDomain(entity: CartEntity): Cart {
    const props: CartProps = {
      id: entity.id,
      customerId: entity.customerId,
      sessionId: entity.sessionId,
      items: entity.items.map((item) => CartItemMapper.toDomain(item).props),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Cart.fromPrimitives(props);
  }

  static toEntity(domain: Cart): CartEntity {
    const primitives = domain.toPrimitives();

    const cartPayload: CartCreate = {
      id: primitives.id,
      customerId: primitives.customerId,
      sessionId: primitives.sessionId,
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

  static fromCache(cached: CartForCache): Cart {
    return Cart.fromPrimitives({
      ...cached,
      createdAt: new Date(cached.createdAt),
      updatedAt: new Date(cached.updatedAt),
    });
  }
}
