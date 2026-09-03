import { UserRoleAssignment } from '../../../core/domain/entities/user-role-assignment';
import { PostgresUserRoleAssignmentRepository } from './postgres-user-role-assignment.repository';
import { UserRoleAssignmentEntity } from '../../orm/user-role-assignment.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresUserRoleAssignmentRepository (Integration - Real DB)', () => {
  let assignmentRepository: PostgresUserRoleAssignmentRepository;
  let seededData: SeededData;
  let roleId: number;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    assignmentRepository = new PostgresUserRoleAssignmentRepository(
      dataSource.getRepository(UserRoleAssignmentEntity),
    );

    roleId = seededData.customerRole.id;

    // Seed creates a customer assignment; remove it so save tests start from a clean slate.
    const deleteResult = await assignmentRepository.deleteByUserId(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(deleteResult);
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
