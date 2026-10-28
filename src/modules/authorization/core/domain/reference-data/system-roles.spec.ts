import { SYSTEM_ROLES, SystemRoleCode } from './system-roles';

describe('SYSTEM_ROLES', () => {
  const permissionsOf = (code: SystemRoleCode) =>
    SYSTEM_ROLES.find((role) => role.code === code)?.permissions;

  it('grants the hosted read-only viewer catalog, order and inventory views only', () => {
    expect(permissionsOf(SystemRoleCode.ADMIN_READONLY)).toEqual([
      'access_admin',
      'view_all_products',
      'view_all_orders',
      'view_all_inventory',
    ]);
  });

  it('does not let the hosted read-only viewer list users or payments', () => {
    const permissions = permissionsOf(SystemRoleCode.ADMIN_READONLY);

    expect(permissions).not.toContain('view_all_users');
    expect(permissions).not.toContain('view_all_payments');
  });

  it('gives the read-only viewer no manage_* permission', () => {
    const permissions = permissionsOf(SystemRoleCode.ADMIN_READONLY) ?? [];

    expect(permissions.some((code) => code.startsWith('manage_'))).toBe(false);
  });
});
