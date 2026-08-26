import { Permission } from '../../../core/domain/entities/permission';
import { Role } from '../../../core/domain/entities/role';
import { PostgresPermissionRepository } from '../postgres-permission-repository/postgres-permission.repository';
import { PostgresRoleRepository } from './postgres-role.repository';
import { PermissionEntity } from '../../orm/permission.schema';
import { RoleEntity } from '../../orm/role.schema';
import { RolePermissionEntity } from '../../orm/role-permission.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresRoleRepository (Integration - Real DB)', () => {
  let roleRepository: PostgresRoleRepository;
  let permissionRepository: PostgresPermissionRepository;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    permissionRepository = new PostgresPermissionRepository(
      dataSource.getRepository(PermissionEntity),
    );
    roleRepository = new PostgresRoleRepository(
      dataSource.getRepository(RoleEntity),
      dataSource.getRepository(RolePermissionEntity),
      dataSource,
    );
  });

  const persistPermission = async (code: string): Promise<void> => {
    const result = await permissionRepository.saveMany([
      new Permission({ id: 0, code, description: code }),
    ]);
    ResultAssertionHelper.assertResultSuccess(result);
  };

  it('save persists a role and links existing permission codes', async () => {
    await persistPermission('orders.read');

    const saveResult = await roleRepository.save(
      Role.create('CUSTOMER', 'Customer', ['orders.read']),
    );
    ResultAssertionHelper.assertResultSuccess(saveResult);
    expect(saveResult.value.code).toBe('CUSTOMER');
    expect(saveResult.value.permissions.codes).toContain('orders.read');

    const byCode = await roleRepository.findByCode('CUSTOMER');
    ResultAssertionHelper.assertResultSuccess(byCode);
    expect(byCode.value?.name).toBe('Customer');

    const codes =
      await roleRepository.findPermissionCodesByRoleCode('CUSTOMER');
    ResultAssertionHelper.assertResultSuccess(codes);
    expect(codes.value).toEqual(['orders.read']);
  });

  it('update diffs role_permissions instead of replace-all', async () => {
    await persistPermission('orders.read');
    await persistPermission('orders.write');

    const created = await roleRepository.save(
      Role.create('STAFF', 'Staff', ['orders.read']),
    );
    ResultAssertionHelper.assertResultSuccess(created);

    const role = created.value;
    role.updatePermissions(['orders.read', 'orders.write']);
    const updated = await roleRepository.update(role);
    ResultAssertionHelper.assertResultSuccess(updated);

    const codes = await roleRepository.findPermissionCodesByRoleCode('STAFF');
    ResultAssertionHelper.assertResultSuccess(codes);
    expect(codes.value?.sort()).toEqual(['orders.read', 'orders.write']);

    role.updatePermissions(['orders.write']);
    const trimmed = await roleRepository.update(role);
    ResultAssertionHelper.assertResultSuccess(trimmed);

    const afterTrim =
      await roleRepository.findPermissionCodesByRoleCode('STAFF');
    ResultAssertionHelper.assertResultSuccess(afterTrim);
    expect(afterTrim.value).toEqual(['orders.write']);
  });

  it('update returns not-found when role id is missing', async () => {
    const orphan = new Role({
      id: 999_999,
      code: 'GHOST',
      name: 'Ghost',
      isSystem: false,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await roleRepository.update(orphan);
    ResultAssertionHelper.assertResultFailure(
      result,
      'Role not found for update',
    );
  });

  it('save rejects a duplicate role code', async () => {
    await roleRepository.save(Role.create('CUSTOMER', 'Customer', []));

    const duplicate = await roleRepository.save(
      Role.create('CUSTOMER', 'Customer copy', []),
    );

    ResultAssertionHelper.assertResultFailure(duplicate, 'Failed to save role');
  });
});
