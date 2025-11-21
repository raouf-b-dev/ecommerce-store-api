// src/modules/carts/infrastructure/persistence/mappers/cart-item.mapper.ts
import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import { CartItem, CartItemProps } from '../../../domain/entities/cart-item';
import { CartItemEntity } from '../../orm/cart-item.schema';

export type CartItemCreate = CreateFromEntity<CartItemEntity, 'cart'>;

export class CartItemMapper {
  static toDomain(entity: CartItemEntity): CartItem {
    const props: CartItemProps = {
      id: entity.id,
      productId: entity.productId,
      productName: entity.productName,
      price: entity.price,
      quantity: entity.quantity,
      imageUrl: entity.imageUrl,
    };

    return CartItem.fromPrimitives(props);
  }

  static toEntity(domain: CartItem): CartItemEntity {
    const primitives = domain.toPrimitives();
    const itemPayload: CartItemCreate = {
      id: primitives.id,
      productId: primitives.productId,
      productName: primitives.productName,
      price: primitives.price,
      quantity: primitives.quantity,
      imageUrl: primitives.imageUrl,
    };
    return Object.assign(new CartItemEntity(), itemPayload);
  }

  static toEntityArray(domains: CartItem[]): CartItemEntity[] {
    return domains.map((domain) => CartItemMapper.toEntity(domain));
  }
}
