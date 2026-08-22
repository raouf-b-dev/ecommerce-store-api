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
      dataSource.getRepository(PermissionEntity),
      dataSource.getRepository(RolePermissionEntity),
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

  it('save rejects a duplicate role code', async () => {
    await roleRepository.save(Role.create('CUSTOMER', 'Customer', []));

    const duplicate = await roleRepository.save(
      Role.create('CUSTOMER', 'Customer copy', []),
    );

    ResultAssertionHelper.assertResultFailure(duplicate, 'Failed to save role');
  });
});
