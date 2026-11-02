import { Result } from 'src/shared-kernel/domain/result';
import { ResultAssertionHelper } from 'src/testing';
import { FindRoleByUserIdUseCase } from './find-role-by-user-id.usecase';
import { UserRoleAssignment } from '../../../domain/entities/user-role-assignment';
import { Role } from '../../../domain/entities/role';
import { MockUserRoleAssignmentRepository } from 'src/modules/authorization/testing/mocks/user-role-assignment.repository.mock';
import { MockRoleRepository } from 'src/modules/authorization/testing/mocks/role-repository.mock';
import { AuthorizationDtoFactory } from 'src/modules/authorization/testing/factories/authorization.dto.factory';
import { ErrorCode } from 'src/shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from 'src/shared-kernel/domain/exceptions/error-kind';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

describe('FindRoleByUserIdUseCase', () => {
  let usecase: FindRoleByUserIdUseCase;
  let userRoleAssignmentRepository: MockUserRoleAssignmentRepository;
  let roleRepository: MockRoleRepository;
  let assignment: UserRoleAssignment;
  let role: Role;

  beforeEach(() => {
    assignment = AuthorizationDtoFactory.buildUserRoleAssignmentEntity({
      id: 1,
      userId: 123,
      roleId: 456,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    role = AuthorizationDtoFactory.buildEntity({
      id: 456,
      code: 'CUSTOMER',
      name: 'Customer',
      isSystem: true,
      permissions: ['view_own_profile', 'view_own_orders', 'cancel_own_orders'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    userRoleAssignmentRepository = new MockUserRoleAssignmentRepository();
    roleRepository = new MockRoleRepository();
    usecase = new FindRoleByUserIdUseCase(
      userRoleAssignmentRepository,
      roleRepository,
    );
  });

  afterEach(() => {
    userRoleAssignmentRepository.reset();
    roleRepository.reset();
  });

  it('should return role record if assignment and role exist', async () => {
    userRoleAssignmentRepository.findByUserId.mockResolvedValue(
      Result.success(assignment),
    );
    roleRepository.findById.mockResolvedValue(Result.success(role));

    const result = await usecase.execute(123);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      id: 456,
      code: 'CUSTOMER',
      permissions: ['view_own_profile', 'view_own_orders', 'cancel_own_orders'],
    });
  });

  it('should return failure if user role assignment not found', async () => {
    userRoleAssignmentRepository.findByUserId.mockResolvedValue(
      Result.success(null),
    );

    const result = await usecase.execute(123);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User role assignment not found',
    );
    expect(result.error.code).toBe(ErrorCode.USER_ROLE_ASSIGNMENT_NOT_FOUND);
    expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
  });

  it('should return failure if role is not found', async () => {
    userRoleAssignmentRepository.findByUserId.mockResolvedValue(
      Result.success(assignment),
    );
    roleRepository.findById.mockResolvedValue(
      ErrorFactory.RepositoryError('Role not found', {
        kind: ErrorKind.NOT_FOUND,
      }),
    );

    const result = await usecase.execute(123);

    ResultAssertionHelper.assertResultFailure(result, 'Role not found');
    expect(result.error.code).toBe(ErrorCode.ROLE_NOT_FOUND);
    expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
  });
});
