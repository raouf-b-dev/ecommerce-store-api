import { Role } from '../../../core/domain/entities/role';
import { UserRoleAssignment } from '../../../core/domain/entities/user-role-assignment';
import { PostgresRoleRepository } from '../postgres-role-repository/postgres-role.repository';
import { PostgresUserRoleAssignmentRepository } from './postgres-user-role-assignment.repository';
import { PermissionEntity } from '../../orm/permission.schema';
import { RoleEntity } from '../../orm/role.schema';
import { RolePermissionEntity } from '../../orm/role-permission.schema';
import { UserRoleAssignmentEntity } from '../../orm/user-role-assignment.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresUserRoleAssignmentRepository (Integration - Real DB)', () => {
  let assignmentRepository: PostgresUserRoleAssignmentRepository;
  let roleRepository: PostgresRoleRepository;
  let seededData: SeededData;
  let roleId: number;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    roleRepository = new PostgresRoleRepository(
      dataSource.getRepository(RoleEntity),
      dataSource.getRepository(PermissionEntity),
      dataSource.getRepository(RolePermissionEntity),
    );
    assignmentRepository = new PostgresUserRoleAssignmentRepository(
      dataSource.getRepository(UserRoleAssignmentEntity),
    );

    const roleResult = await roleRepository.save(
      Role.create('CUSTOMER', 'Customer', []),
    );
    ResultAssertionHelper.assertResultSuccess(roleResult);
    roleId = roleResult.value.id;
  });

  it('save persists an assignment and findByUserId returns it', async () => {
    const saveResult = await assignmentRepository.save(
      UserRoleAssignment.create({
        userId: seededData.customerUser.id,
        roleId,
      }),
    );
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const found = await assignmentRepository.findByUserId(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value?.roleId).toBe(roleId);
  });

  it('save rejects a second assignment for the same userId', async () => {
    await assignmentRepository.save(
      UserRoleAssignment.create({
        userId: seededData.customerUser.id,
        roleId,
      }),
    );

    const duplicate = await assignmentRepository.save(
      UserRoleAssignment.create({
        userId: seededData.customerUser.id,
        roleId,
      }),
    );

    ResultAssertionHelper.assertResultFailure(
      duplicate,
      'Failed to save user role assignment',
    );
  });

  it('deleteByUserId removes the assignment', async () => {
    await assignmentRepository.save(
      UserRoleAssignment.create({
        userId: seededData.customerUser.id,
        roleId,
      }),
    );

    const deleteResult = await assignmentRepository.deleteByUserId(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(deleteResult);

    const found = await assignmentRepository.findByUserId(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value).toBeNull();
  });
});
