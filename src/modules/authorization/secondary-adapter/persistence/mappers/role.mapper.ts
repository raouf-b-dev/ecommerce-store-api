import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { UpdateFromEntity } from '../../../../../infrastructure/mappers/utils/update-from-entity.type';
import { RoleEntity } from '../../orm/role.schema';
import { Role } from '../../../../authorization/core/domain/entities/role';

/** Columns for insert; id and timestamps are persistence-owned. */
export type RoleInsert = CreateFromEntity<
  RoleEntity,
  'id' | 'rolePermissions' | 'createdAt' | 'updatedAt'
>;

/** Parent columns written on update; join rows synced separately. */
export type RoleUpdate = UpdateFromEntity<
  RoleEntity,
  'id' | 'code' | 'rolePermissions' | 'createdAt' | 'updatedAt'
>;

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

  static toInsertPayload(domain: Role): RoleInsert {
    return {
      code: domain.code,
      name: domain.name,
      isSystem: domain.isSystem,
    };
  }

  static toUpdatePayload(domain: Role): RoleUpdate {
    return {
      name: domain.name,
      isSystem: domain.isSystem,
    };
  }
}
