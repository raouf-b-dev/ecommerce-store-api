import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { RoleEntity } from '../../orm/role.schema';
import { Role } from '../../../../authorization/core/domain/entities/role';

type RoleCreate = CreateFromEntity<RoleEntity, 'rolePermissions'>;

export class RoleMapper {
  static toDomain(entity: RoleEntity): Role {
    const permissionCodes =
      entity.rolePermissions?.map((rp) => rp.permission.code) || [];
    return new Role({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      isSystem: entity.isSystem,
      permissions: permissionCodes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: Role): RoleEntity {
    const primitives = domain.toPrimitives();

    const payload: RoleCreate = {
      id: primitives.id ?? 0,
      code: primitives.code,
      name: primitives.name,
      isSystem: primitives.isSystem,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    return Object.assign(new RoleEntity(), payload);
  }

  static toDomainArray(entities: RoleEntity[]): Role[] {
    return entities.map((entity) => RoleMapper.toDomain(entity));
  }

  static toEntityArray(domains: Role[]): RoleEntity[] {
    return domains.map((domain) => RoleMapper.toEntity(domain));
  }
}
