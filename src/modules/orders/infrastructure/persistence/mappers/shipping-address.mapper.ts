// src/modules/orders/infrastructure/mappers/shipping-address.mapper.ts
import { IShippingAddress } from '../../../domain/interfaces/shipping-address.interface';
import {
  ShippingAddress,
  ShippingAddressProps,
} from '../../../domain/value-objects/shipping-address';
import { ShippingAddressEntity } from '../../orm/shipping-address.schema';

export class ShippingAddressMapper {
  static toDomain(entity: ShippingAddressEntity): ShippingAddress {
    const props: ShippingAddressProps = {
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      street: entity.street,
      city: entity.city,
      state: entity.state,
      postalCode: entity.postalCode,
      country: entity.country,
      phone: entity.phone,
    };

    return ShippingAddress.fromPrimitives(props);
  }

  static toEntity(primitives: IShippingAddress): ShippingAddressEntity {
    const entity: ShippingAddressEntity = {
      id: primitives.id,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
      street: primitives.street,
      city: primitives.city,
      state: primitives.state,
      postalCode: primitives.postalCode,
      country: primitives.country,
      phone: primitives.phone,
    };

    return entity;
  }

  static toDomainArray(entities: ShippingAddressEntity[]): ShippingAddress[] {
    return entities.map((entity) => ShippingAddressMapper.toDomain(entity));
  }

  static toEntityArray(domains: ShippingAddress[]): ShippingAddressEntity[] {
    return domains.map((domain) => ShippingAddressMapper.toEntity(domain));
  }
}
