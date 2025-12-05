import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import { Customer, CustomerProps } from '../../../domain/entities/customer';
import { ICustomer } from '../../../domain/interfaces/customer.interface';
import { CustomerEntity } from '../../orm/customer.schema';
import { AddressMapper } from './address.mapper';
import { AddressEntity } from '../../orm/address.schema';

type CustomerCreate = CreateFromEntity<CustomerEntity, 'addresses'>;

export class CustomerMapper {
  static toDomain(entity: CustomerEntity): Customer {
    const props: CustomerProps = {
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      email: entity.email,
      phone: entity.phone,
      addresses: entity.addresses
        ? entity.addresses.map(
            (addr) => AddressMapper.toDomain(addr).toPrimitives() as any,
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Customer.fromPrimitives(props);
  }

  static toEntity(domain: Customer): CustomerEntity {
    const primitives = domain.toPrimitives();

    if (!primitives.id) {
      throw new Error('Customer ID is required for persistence');
    }

    const customerPayload: CustomerCreate = {
      id: primitives.id,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
      email: primitives.email,
      phone: primitives.phone,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    const entity: CustomerEntity = Object.assign(
      new CustomerEntity(),
      customerPayload,
    );

    const addressEntities: AddressEntity[] = AddressMapper.toEntityArray(
      domain.addresses.map((addr) => domain.findAddress(addr.id!)),
    );

    entity.addresses = addressEntities.map((addressEntity) => {
      addressEntity.customer = entity;
      addressEntity.customerId = entity.id;
      return addressEntity;
    });

    return entity;
  }
}

export type CustomerForCache = Omit<ICustomer, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

export class CustomerCacheMapper {
  static toCache(domain: Customer): CustomerForCache {
    const primitives = domain.toPrimitives();
    return {
      ...primitives,
      createdAt: primitives.createdAt.getTime(),
      updatedAt: primitives.updatedAt.getTime(),
    };
  }

  static fromCache(cached: CustomerForCache): Customer {
    return Customer.fromPrimitives({
      ...cached,
      createdAt: new Date(cached.createdAt),
      updatedAt: new Date(cached.updatedAt),
    } as any);
  }
}
