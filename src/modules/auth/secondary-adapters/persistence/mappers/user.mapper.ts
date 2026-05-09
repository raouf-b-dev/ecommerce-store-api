import { User, UserProps } from '../../../core/domain/entities/user';
import { UserEntity } from '../../orm/user.schema';
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';

type UserCreate = CreateFromEntity<UserEntity, 'roleEntity'>;

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    const props: UserProps = {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      mustChangePassword: entity.mustChangePassword,
      roleId: entity.roleId,
      isActive: entity.isActive,
      customerId: entity.customerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return new User(props);
  }

  static toEntity(domain: User): UserEntity {
    const primitives = domain.toPrimitives();

    const userPayload: UserCreate = {
      id: primitives.id ?? 0,
      email: primitives.email,
      passwordHash: primitives.passwordHash,
      mustChangePassword: primitives.mustChangePassword,
      roleId: primitives.roleId || null,
      isActive: primitives.isActive,
      customerId: primitives.customerId,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
    const entity = Object.assign(new UserEntity(), userPayload);
    return entity;
  }
}
export interface UserForCache {
  id: number;
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
  roleId: number | null;
  isActive: boolean;
  customerId: number | null;
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
      mustChangePassword: primitives.mustChangePassword,
      roleId: primitives.roleId || null,
      isActive: primitives.isActive,
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
      mustChangePassword: cache.mustChangePassword,
      roleId: cache.roleId,
      isActive: cache.isActive,
      customerId: cache.customerId,
      createdAt: new Date(cache.createdAt),
      updatedAt: new Date(cache.updatedAt),
    });
  }
}
