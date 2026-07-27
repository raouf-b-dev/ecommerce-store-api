import { Result } from 'src/shared-kernel/domain/result';
import { FindRoleByUserIdUseCase } from './find-role-by-user-id.usecase';
import { UserRoleAssignment } from '../../../domain/entities/user-role-assignment';
import { Role } from '../../../domain/entities/role';
import { MockUserRoleAssignmentRepository } from 'src/modules/authorization/testing/mocks/user-role-assignment.repository.mock';
import { MockRoleRepository } from 'src/modules/authorization/testing/mocks/role-repository.mock';
import { AuthorizationDtoFactory } from 'src/modules/authorization/testing/factories/authorization.dto.factory';

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
      permissions: [],
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

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value).toEqual({
        id: 456,
        code: 'CUSTOMER',
      });
    }
  });

  it('should return failure if user role assignment not found', async () => {
    userRoleAssignmentRepository.findByUserId.mockResolvedValue(
      Result.success(null),
    );

    const result = await usecase.execute(123);

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toBe('User role assignment not found');
    }
  });
});
