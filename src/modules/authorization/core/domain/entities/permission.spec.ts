import { Permission } from './permission';

describe('Permission Entity', () => {
  it('should create a permission and return primitives', () => {
    const permissionProps = {
      id: 1,
      code: 'manage_users',
      description: 'Can manage users',
    };

    const permission = new Permission(permissionProps);

    expect(permission.id).toBe(1);
    expect(permission.code).toBe('manage_users');
    expect(permission.description).toBe('Can manage users');

    const primitives = permission.toPrimitives();
    expect(primitives).toEqual(permissionProps);
  });

  it('should create a permission from primitives', () => {
    const primitives = {
      id: 2,
      code: 'manage_roles',
      description: 'Can manage roles',
    };

    const permission = Permission.fromPrimitives(primitives);

    expect(permission.id).toBe(2);
    expect(permission.code).toBe('manage_roles');
    expect(permission.description).toBe('Can manage roles');
  });

  it('should handle null description gracefully', () => {
    const permissionProps = {
      id: 3,
      code: 'view_reports',
      description: null,
    };

    const permission = new Permission(permissionProps);

    expect(permission.id).toBe(3);
    expect(permission.code).toBe('view_reports');
    expect(permission.description).toBeNull();
  });
});
