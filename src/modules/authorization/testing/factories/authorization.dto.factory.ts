import { Role, RoleProps } from '../../core/domain/entities/role';
import {
  UserRoleAssignment,
  UserRoleAssignmentProps,
} from '../../core/domain/entities/user-role-assignment';
import { IRole } from '../../core/domain/interfaces/role.interface';
import { IUserRoleAssignment } from '../../core/domain/interfaces/user-role-assignment.interface';
import { CreateRoleDto } from '../../primary-adapter/dto/create-role.dto';

export class AuthorizationDtoFactory {
  static createCreateRoleDto(
    overrides: Partial<CreateRoleDto> = {},
  ): CreateRoleDto {
    return {
      code: 'MANAGER',
      name: 'Manager',
      permissions: ['manage_products'],
      ...overrides,
    };
  }
  static buildProps(overrides: Partial<RoleProps> = {}): RoleProps {
    const now = new Date();
    return {
      id: 1,
      code: 'MANAGER',
      name: 'Manager',
      isSystem: false,
      permissions: ['manage_products'],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  static buildPrimitives(overrides: Partial<IRole> = {}): IRole {
    const props = this.buildProps();
    return {
      ...props,
      permissions: { codes: props.permissions },
      ...overrides,
    };
  }

  static buildEntity(overrides: Partial<RoleProps> = {}): Role {
    return new Role(this.buildProps(overrides));
  }

  static buildUserRoleAssignmentEntity(
    overrides: Partial<UserRoleAssignmentProps> = {},
  ): UserRoleAssignment {
    const now = new Date();
    return UserRoleAssignment.create({
      id: 1,
      userId: 123,
      roleId: 456,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  }

  static buildUserRoleAssignmentPrimitives(
    overrides: Partial<IUserRoleAssignment> = {},
  ): IUserRoleAssignment {
    const now = new Date();
    return {
      id: 1,
      userId: 123,
      roleId: 456,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }
}
