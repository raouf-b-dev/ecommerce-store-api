import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { Address, AddressProps } from '../../../core/domain/entities/address';
import { IAddress } from '../../../core/domain/interfaces/address.interface';
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
    return this.fromPrimitiveToEntity(domain.toPrimitives());
  }

  static toEntityArray(domainAddresses: Address[]): AddressEntity[] {
    return domainAddresses.map((address) => this.toEntity(address));
  }

  static fromPrimitiveToEntity(address: IAddress): AddressEntity {
    const addressPayload: AddressCreate = {
      id: address.id || 0,
      customerId: address.customerId,
      street: address.street,
      street2: address.street2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      type: address.type,
      isDefault: address.isDefault,
      deliveryInstructions: address.deliveryInstructions,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };

    return Object.assign(new AddressEntity(), addressPayload);
  }

  static fromPrimitiveArrayToEntityArray(
    addresses: IAddress[],
  ): AddressEntity[] {
    return addresses.map((address) => this.fromPrimitiveToEntity(address));
  }
}
