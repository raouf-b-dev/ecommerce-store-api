import { Role } from './role';
import { ResultAssertionHelper } from '../../../../../testing';

describe('Role Entity', () => {
  it('should initialize correctly with valid properties', () => {
    const role = new Role({
      id: 1,
      code: 'MANAGER',
      name: 'Manager',
      isSystem: false,
      permissions: ['manage_products'],
    });

    expect(role.id).toBe(1);
    expect(role.code).toBe('MANAGER');
    expect(role.name).toBe('Manager');
    expect(role.isSystem).toBe(false);
    expect(role.permissions.has('manage_products')).toBe(true);
    expect(role.createdAt).toBeUndefined();
    expect(role.updatedAt).toBeUndefined();
  });

  it('should successfully update name for non-system role', () => {
    const role = new Role({
      id: 2,
      code: 'USER',
      name: 'User',
      isSystem: false,
      permissions: [],
    });

    const result = role.updateName('Standard User');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(role.name).toBe('Standard User');
  });

  it('should return DomainError when updating name of a system role', () => {
    const role = new Role({
      id: 3,
      code: 'ADMIN',
      name: 'Admin',
      isSystem: true,
      permissions: [],
    });

    const result = role.updateName('Super Admin');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Cannot update name of a system role',
    );
    expect(role.name).toBe('Admin'); // Name should remain unchanged
  });

  it('should successfully update permissions', () => {
    const role = new Role({
      id: 4,
      code: 'STAFF',
      name: 'Staff',
      isSystem: false,
      permissions: ['view_all_products'],
    });

    role.updatePermissions(['manage_products', 'manage_orders']);

    expect(role.permissions.has('view_all_products')).toBe(false);
    expect(role.permissions.has('manage_products')).toBe(true);
    expect(role.permissions.has('manage_orders')).toBe(true);
  });

  it('should validate successfully for deletion of non-system role', () => {
    const role = new Role({
      id: 5,
      code: 'GUEST',
      name: 'Guest',
      isSystem: false,
      permissions: [],
    });

    const result = role.validateNotSystemForDeletion();
    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('should return DomainError when validating deletion of a system role', () => {
    const role = new Role({
      id: 6,
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      isSystem: true,
      permissions: [],
    });

    const result = role.validateNotSystemForDeletion();
    ResultAssertionHelper.assertResultFailure(
      result,
      'Cannot delete a system role',
    );
  });

  it('should round-trip to and from primitives without data loss', () => {
    const originalDate = new Date();
    const role = new Role({
      id: 7,
      code: 'CUSTOM',
      name: 'Custom',
      isSystem: false,
      permissions: ['manage_carts'],
      createdAt: originalDate,
      updatedAt: originalDate,
    });

    const primitives = role.toPrimitives();

    expect(primitives).toEqual({
      id: 7,
      code: 'CUSTOM',
      name: 'Custom',
      isSystem: false,
      permissions: { codes: ['manage_carts'] },
      createdAt: originalDate,
      updatedAt: originalDate,
    });

    const reconstructedRole = Role.fromPrimitives(primitives);

    expect(reconstructedRole.id).toBe(role.id);
    expect(reconstructedRole.code).toBe(role.code);
    expect(reconstructedRole.name).toBe(role.name);
    expect(reconstructedRole.isSystem).toBe(role.isSystem);
    expect(reconstructedRole.permissions.codes).toEqual(role.permissions.codes);
    expect(reconstructedRole.createdAt).toEqual(role.createdAt);
    expect(reconstructedRole.updatedAt).toEqual(role.updatedAt);
  });
});
