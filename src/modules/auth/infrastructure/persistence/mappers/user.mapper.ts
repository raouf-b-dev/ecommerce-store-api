import { User, UserProps } from '../../../domain/entities/user';
import { UserEntity } from '../../orm/user.schema';
import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';

type UserCreate = CreateFromEntity<UserEntity>;

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    const props: UserProps = {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      role: entity.role,
      customerId: entity.customerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return new User(props);
  }

  static toEntity(domain: User): UserEntity {
    const primitives = domain.toPrimitives();

    const userPayload: UserCreate = {
      id: primitives.id || '',
      email: primitives.email,
      passwordHash: primitives.passwordHash,
      role: primitives.role,
      customerId: primitives.customerId,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
    const entity = Object.assign(new UserEntity(), userPayload);
    return entity;
  }
}
export interface UserForCache {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class UserCacheMapper {
  static toCache(domain: User): UserForCache {
    const primitives = domain.toPrimitives();
    return {
      id: primitives.id!,
      email: primitives.email,
      passwordHash: primitives.passwordHash,
      role: primitives.role,
      customerId: primitives.customerId,
      createdAt: primitives.createdAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  static fromCache(cache: UserForCache): User {
    return User.fromPrimitives({
      id: cache.id,
      email: cache.email,
      passwordHash: cache.passwordHash,
      role: cache.role as any,
      customerId: cache.customerId,
      createdAt: new Date(cache.createdAt),
      updatedAt: new Date(cache.updatedAt),
    });
  }
}
