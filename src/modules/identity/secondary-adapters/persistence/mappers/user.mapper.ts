import { User, UserProps } from '../../../core/domain/entities/user';
import { UserEntity } from '../../orm/user.schema';
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { AddressMapper } from './address.mapper';
import { IAddress } from 'src/modules/identity/core/domain/interfaces/address.interface';

type UserCreate = CreateFromEntity<UserEntity, 'addresses' | 'version'>;

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    const props: UserProps = {
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      phone: entity.phone,
      email: entity.email,

      addresses: entity.addresses
        ? entity.addresses.map((addr) => AddressMapper.toDomain(addr))
        : [],
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return new User(props);
  }

  static toEntity(domain: User): UserEntity {
    const primitives = domain.toPrimitives();

    const userPayload: UserCreate = {
      id: primitives.id ?? 0,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
      phone: primitives.phone,
      email: primitives.email,
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    const userEntity = Object.assign(new UserEntity(), userPayload);
    userEntity.addresses = primitives.addresses.map((address) =>
      AddressMapper.fromPrimitiveToEntity(address),
    );
    return userEntity;
  }
}
export interface UserForCache {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  addresses: IAddress[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserCacheMapper {
  static toCache(domain: User): UserForCache {
    const primitives = domain.toPrimitives();
    return {
      id: primitives.id!,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
      phone: primitives.phone ?? null,
      email: primitives.email,
      addresses: primitives.addresses,
      isActive: primitives.isActive,
      createdAt: primitives.createdAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  static fromCache(cache: UserForCache): User {
    return User.fromProps({
      id: cache.id,
      firstName: cache.firstName,
      lastName: cache.lastName,
      phone: cache.phone,
      email: cache.email,
      addresses: cache.addresses,
      isActive: cache.isActive,
      createdAt: new Date(cache.createdAt),
      updatedAt: new Date(cache.updatedAt),
    });
  }
}
