import { Role, RoleProps, IRole } from '../../core/domain/entities/role';

export class RoleTestFactory {
  static buildProps(overrides: Partial<RoleProps> = {}): RoleProps {
    return {
      id: 1,
      code: 'MANAGER',
      name: 'Manager',
      isSystem: false,
      permissions: ['manage_products'],
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
}
