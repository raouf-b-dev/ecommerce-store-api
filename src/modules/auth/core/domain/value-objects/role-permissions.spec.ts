import { RolePermissionsVO } from './role-permissions';

describe('RolePermissionsVO', () => {
  it('should create from codes and check permissions', () => {
    const codes = ['manage_products', 'view_all_products'];
    const rolePermissions = RolePermissionsVO.fromCodes(codes);

    expect(rolePermissions.has('manage_products')).toBe(true);
    expect(rolePermissions.has('view_all_products')).toBe(true);
    expect(rolePermissions.has('manage_users')).toBe(false);

    expect(rolePermissions.codes).toEqual(expect.arrayContaining(codes));
    expect(rolePermissions.codes.length).toBe(2);
  });

  it('should create from primitives', () => {
    const codes = ['manage_roles'];
    const rolePermissions = RolePermissionsVO.fromPrimitives({ codes });

    expect(rolePermissions.has('manage_roles')).toBe(true);
  });

  it('should handle empty codes', () => {
    const rolePermissions = RolePermissionsVO.fromCodes([]);
    expect(rolePermissions.codes.length).toBe(0);
    expect(rolePermissions.has('manage_products')).toBe(false);
  });

  it('should deduplicate duplicate codes', () => {
    const rolePermissions = RolePermissionsVO.fromCodes([
      'manage_roles',
      'manage_roles',
      'view_roles',
    ]);
    expect(rolePermissions.codes.length).toBe(2);
    expect(rolePermissions.codes).toEqual(
      expect.arrayContaining(['manage_roles', 'view_roles']),
    );
  });

  it('should round-trip to and from primitives', () => {
    const codes = ['manage_products'];
    const rolePermissions = RolePermissionsVO.fromCodes(codes);

    const primitives = rolePermissions.toPrimitives();
    expect(primitives).toEqual({ codes });

    const reconstructed = RolePermissionsVO.fromPrimitives(primitives);
    expect(reconstructed.codes).toEqual(codes);
  });
});
