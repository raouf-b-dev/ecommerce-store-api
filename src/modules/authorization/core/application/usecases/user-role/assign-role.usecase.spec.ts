import { HttpStatus } from '@nestjs/common';
import { AssignRoleUseCase } from './assign-role.usecase';
import { Role } from '../../../domain/entities/role';
import {
  AuthorizationDtoFactory,
  MockRoleRepository,
  MockUserRoleAssignmentRepository,
} from 'src/modules/authorization/testing';
import { ResultAssertionHelper } from 'src/testing';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';

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
    });

    userRoleAssignmentRepository = new MockUserRoleAssignmentRepository();
    roleRepository = new MockRoleRepository();

    usecase = new AssignRoleUseCase(
      userRoleAssignmentRepository,
      roleRepository,
    );
  });

  afterEach(() => {
    userRoleAssignmentRepository.reset();
    roleRepository.reset();
  });

  it('should assign specified role when assignment does not exist', async () => {
    userRoleAssignmentRepository.mockSuccessfulFindByUserId(null);
    roleRepository.mockSuccessfulFindByCode(role);
    userRoleAssignmentRepository.mockPassthroughSave();

    const result = await usecase.execute({
      userId: 123,
      roleCode: 'SUPER_ADMIN',
    });

    expect(result.isSuccess).toBe(true);
    expect(userRoleAssignmentRepository.save).toHaveBeenCalled();
  });

  it('should update existing assignment if user already has a role', async () => {
    const existingAssignment =
      AuthorizationDtoFactory.buildUserRoleAssignmentEntity({
        id: 1,
        userId: 123,
        roleId: 2,
      });
    const newRole = AuthorizationDtoFactory.buildEntity({
      id: 10,
      code: 'ADMIN',
      name: 'Admin',
      isSystem: true,
      permissions: [],
    });

    userRoleAssignmentRepository.mockSuccessfulFindByUserId(existingAssignment);
    roleRepository.mockSuccessfulFindByCode(newRole);
    userRoleAssignmentRepository.mockPassthroughSave();

    const result = await usecase.execute({ userId: 123, roleCode: 'ADMIN' });

    expect(result.isSuccess).toBe(true);
    expect(userRoleAssignmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 10 }),
    );
  });

  it('should return 404 when role code does not exist', async () => {
    userRoleAssignmentRepository.mockSuccessfulFindByUserId(null);
    roleRepository.mockSuccessfulFindByCode(null);

    const result = await usecase.execute({
      userId: 123,
      roleCode: 'UNKNOWN',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Role UNKNOWN not found',
      UseCaseError,
    );
    if (result.isFailure)
      expect(result.error.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(userRoleAssignmentRepository.save).not.toHaveBeenCalled();
  });
});
