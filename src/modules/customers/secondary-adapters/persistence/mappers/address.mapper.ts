import { CreateFromEntity } from '../../../../../shared-kernel/infrastructure/mappers/utils/create-from-entity.type';
import { Address, AddressProps } from '../../../core/domain/entities/address';
import { AddressEntity } from '../../orm/address.schema';

type AddressCreate = CreateFromEntity<AddressEntity, 'customer'>;

export class AddressMapper {
  static toDomain(entity: AddressEntity): Address {
    const props: AddressProps = {
      id: entity.id,
      customerId: entity.customerId,
      street: entity.street,
      street2: entity.street2,
      city: entity.city,
      state: entity.state,
      postalCode: entity.postalCode,
      country: entity.country,
      type: entity.type,
      isDefault: entity.isDefault,
      deliveryInstructions: entity.deliveryInstructions,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Address.fromPrimitives(props);
  }

  static toEntity(domain: Address): AddressEntity {
    const primitives = domain.toPrimitives();

    const addressPayload: AddressCreate = {
      id: primitives.id || 0,
      customerId: primitives.customerId,
      street: primitives.street,
      street2: primitives.street2,
      city: primitives.city,
      state: primitives.state,
      postalCode: primitives.postalCode,
      country: primitives.country,
      type: primitives.type as any,
      isDefault: primitives.isDefault,
      deliveryInstructions: primitives.deliveryInstructions,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    const entity: AddressEntity = Object.assign(
      new AddressEntity(),
      addressPayload,
    );

    return entity;
  }

  static toEntityArray(domainAddresses: Address[]): AddressEntity[] {
    return domainAddresses.map((address) => this.toEntity(address));
  }
}
