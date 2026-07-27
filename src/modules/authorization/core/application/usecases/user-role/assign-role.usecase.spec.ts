import { Result } from 'src/shared-kernel/domain/result';
import { AssignRoleUseCase } from './assign-role.usecase';
import { UserRoleAssignment } from '../../../domain/entities/user-role-assignment';
import { Role } from '../../../domain/entities/role';
import { MockRoleRepository } from 'src/modules/authorization/testing/mocks/role-repository.mock';
import { MockUserRoleAssignmentRepository } from 'src/modules/authorization/testing/mocks/user-role-assignment.repository.mock';
import { AuthorizationDtoFactory } from 'src/modules/authorization/testing/factories/authorization.dto.factory';

describe('AssignRoleUseCase', () => {
  let usecase: AssignRoleUseCase;
  let userRoleAssignmentRepository: MockUserRoleAssignmentRepository;
  let roleRepository: MockRoleRepository;
  let role: Role;

  beforeEach(() => {
    role = AuthorizationDtoFactory.buildEntity({
      id: 99,
      code: 'SUPER_ADMIN',
      name: 'Super Admin',
      isSystem: true,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    userRoleAssignmentRepository = new MockUserRoleAssignmentRepository();
    roleRepository = new MockRoleRepository();

    usecase = new AssignRoleUseCase(
      userRoleAssignmentRepository,
      roleRepository,
    );
  });

  it('should assign specified role when assignment does not exist', async () => {
    userRoleAssignmentRepository.findByUserId.mockResolvedValue(
      Result.success(null),
    );
    roleRepository.findByCode.mockResolvedValue(Result.success(role));
    userRoleAssignmentRepository.save.mockImplementation((assignment) =>
      Promise.resolve(Result.success(assignment)),
    );

    const result = await usecase.execute({
      userId: 123,
      roleCode: 'SUPER_ADMIN',
    });

    expect(result.isSuccess).toBe(true);
    expect(userRoleAssignmentRepository.save).toHaveBeenCalled();
  });

  it('should update existing assignment if user already has a role', async () => {
    const existingAssignment = UserRoleAssignment.fromPersistence({
      id: 1,
      userId: 123,
      roleId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const newRole = new Role({
      id: 10,
      code: 'ADMIN',
      name: 'Admin',
      isSystem: true,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    userRoleAssignmentRepository.findByUserId.mockResolvedValue(
      Result.success(existingAssignment),
    );
    roleRepository.findByCode.mockResolvedValue(Result.success(newRole));
    userRoleAssignmentRepository.save.mockImplementation((assignment) =>
      Promise.resolve(Result.success(assignment)),
    );

    const result = await usecase.execute({ userId: 123, roleCode: 'ADMIN' });

    expect(result.isSuccess).toBe(true);
    expect(userRoleAssignmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 10 }),
    );
  });
});
