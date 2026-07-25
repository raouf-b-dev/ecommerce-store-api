import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { UserRoleAssignmentEntity } from '../../orm/user-role-assignment.schema';
import { UserRoleAssignment } from 'src/modules/authorization/core/domain/entities/user-role-assignment';

type UserRoleAssignmentCreate = CreateFromEntity<
  UserRoleAssignmentEntity,
  'role'
>;

export class UserRoleAssignmentMapper {
  static toDomain(entity: UserRoleAssignmentEntity): UserRoleAssignment {
    return UserRoleAssignment.fromPersistence({
      id: entity.id,
      roleId: entity.roleId,
      userId: entity.userId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: UserRoleAssignment): UserRoleAssignmentEntity {
    const primitives = domain.toPrimitives();

    const payload: UserRoleAssignmentCreate = {
      id: primitives.id ?? 0,
      userId: primitives.userId,
      roleId: primitives.roleId,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    return Object.assign(new UserRoleAssignmentEntity(), payload);
  }

  static toDomainArray(
    entities: UserRoleAssignmentEntity[],
  ): UserRoleAssignment[] {
    return entities.map((entity) => UserRoleAssignmentMapper.toDomain(entity));
  }

  static toEntityArray(
    domains: UserRoleAssignment[],
  ): UserRoleAssignmentEntity[] {
    return domains.map((domain) => UserRoleAssignmentMapper.toEntity(domain));
  }
}
