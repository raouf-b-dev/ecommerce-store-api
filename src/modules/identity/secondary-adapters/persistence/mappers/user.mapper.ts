import { User, UserProps } from '../../../core/domain/entities/user';
import { Address } from '../../../core/domain/entities/address';
import { UserEntity } from '../../orm/user.schema';
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { UpdateFromEntity } from '../../../../../infrastructure/mappers/utils/update-from-entity.type';
import { AddressMapper } from './address.mapper';
import { IAddress } from 'src/modules/identity/core/domain/interfaces/address.interface';
import { IUser } from '../../../core/domain/interfaces/user.interface';

type UserCreate = CreateFromEntity<UserEntity, 'addresses' | 'version'>;

export type UserUpdate = UpdateFromEntity<
  UserEntity,
  'id' | 'version' | 'createdAt' | 'updatedAt' | 'addresses'
>; // persistence-owned + addresses synced after the OCC parent UPDATE

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

  static toUpdatePayload(domain: User): UserUpdate {
    const entity = UserMapper.toEntity(domain);

    return {
      firstName: entity.firstName,
      lastName: entity.lastName,
      phone: entity.phone,
      email: entity.email,
      isActive: entity.isActive,
    };
  }
}

export type UserForCache = Omit<
  IUser,
  'createdAt' | 'updatedAt' | 'id' | 'addresses'
> & {
  id: number;
  createdAt: number;
  updatedAt: number;
  addresses: Array<
    Omit<IAddress, 'createdAt' | 'updatedAt'> & {
      createdAt: number;
      updatedAt: number;
    }
  >;
};

export class UserCacheMapper {
  static toCache(domain: User): UserForCache {
    const primitives = domain.toPrimitives();
    return {
      id: primitives.id!,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
      phone: primitives.phone ?? null,
      email: primitives.email,
      addresses: primitives.addresses.map((address) => {
        const props =
          address instanceof Address ? address.toPrimitives() : address;
        return {
          ...props,
          createdAt: props.createdAt.getTime(),
          updatedAt: props.updatedAt.getTime(),
        };
      }),
      isActive: primitives.isActive,
      createdAt: primitives.createdAt.getTime(),
      updatedAt: primitives.updatedAt.getTime(),
    };
  }

  static fromCache(cached: UserForCache): User | null {
    try {
      return User.fromProps({
        ...cached,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
        addresses: cached.addresses.map((address) => ({
          ...address,
          createdAt: new Date(address.createdAt),
          updatedAt: new Date(address.updatedAt),
        })),
      });
    } catch {
      return null;
    }
  }
}
