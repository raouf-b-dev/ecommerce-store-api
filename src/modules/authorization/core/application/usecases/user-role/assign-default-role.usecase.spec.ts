import { Result } from 'src/shared-kernel/domain/result';
import { AssignDefaultRoleUseCase } from './assign-default-role.usecase';
import { Role } from '../../../domain/entities/role';
import { MockRoleRepository } from 'src/modules/authorization/testing/mocks/role-repository.mock';
import { MockUserRoleAssignmentRepository } from 'src/modules/authorization/testing/mocks/user-role-assignment.repository.mock';
import { AuthorizationDtoFactory } from 'src/modules/authorization/testing/factories/authorization.dto.factory';

describe('AssignDefaultRoleUseCase', () => {
  let usecase: AssignDefaultRoleUseCase;
  let userRoleAssignmentRepository: MockUserRoleAssignmentRepository;
  let roleRepository: MockRoleRepository;
  let role: Role;
  beforeEach(() => {
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

    usecase = new AssignDefaultRoleUseCase(
      userRoleAssignmentRepository,
      roleRepository,
    );
  });

  it('should assign default role when assignment does not exist', async () => {
    userRoleAssignmentRepository.findByUserId.mockResolvedValue(
      Result.success(null),
    );
    roleRepository.findByCode.mockResolvedValue(Result.success(role));
    userRoleAssignmentRepository.save.mockImplementation((assignment) =>
      Promise.resolve(Result.success(assignment)),
    );

    const result = await usecase.execute(123);

    expect(result.isSuccess).toBe(true);
    expect(userRoleAssignmentRepository.save).toHaveBeenCalled();
  });
});
