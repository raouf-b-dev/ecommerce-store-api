// src/modules/orders/infrastructure/mappers/customer-info.mapper.ts
import { ICustomerInfo } from '../../../domain/interfaces/ICustomerInfo';
import {
  CustomerInfo,
  CustomerInfoProps,
} from '../../../domain/value-objects/customer-info';
import { CustomerInfoEntity } from '../../orm/customer-info.schema';

export class CustomerInfoMapper {
  static toDomain(entity: CustomerInfoEntity): CustomerInfo {
    const props: CustomerInfoProps = {
      customerId: entity.customerId,
      email: entity.email,
      phone: entity.phone,
      firstName: entity.firstName,
      lastName: entity.lastName,
    };

    return CustomerInfo.fromPrimitives(props);
  }

  static toEntity(primitives: ICustomerInfo): CustomerInfoEntity {
    const entity: CustomerInfoEntity = {
      customerId: primitives.customerId,
      email: primitives.email,
      phone: primitives.phone,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
    };

    return entity;
  }

  static toDomainArray(entities: CustomerInfoEntity[]): CustomerInfo[] {
    return entities.map((entity) => CustomerInfoMapper.toDomain(entity));
  }

  static toEntityArray(domains: CustomerInfo[]): CustomerInfoEntity[] {
    return domains.map((domain) => CustomerInfoMapper.toEntity(domain));
  }
}
